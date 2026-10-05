const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const Stripe = require('stripe');

setGlobalOptions({ region: 'us-central1' });

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

admin.initializeApp();

const CHECKOUT_RETURN_TARGETS = Object.freeze({
    'https://karaoke.unodev.com.br': {
        successPath: '/App/index.html',
        cancelPath: '/index.html'
    },
    'https://karaoke-party-2.vercel.app': {
        successPath: '/App/cabine-pc.html',
        cancelPath: '/'
    }
});

function resolveCheckoutReturnTarget(returnBaseUrl) {
    if (!returnBaseUrl) return CHECKOUT_RETURN_TARGETS['https://karaoke.unodev.com.br'];

    let origin;
    try {
        origin = new URL(returnBaseUrl).origin;
    } catch {
        throw new HttpsError('invalid-argument', 'Endereço de retorno inválido.');
    }

    const target = CHECKOUT_RETURN_TARGETS[origin];
    if (!target) throw new HttpsError('permission-denied', 'Domínio de retorno não autorizado.');
    return { origin, ...target };
}

exports.createCheckoutSession = onCall(
    { secrets: [STRIPE_SECRET_KEY] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Login necessário.');
        }

        const { planId, returnBaseUrl } = request.data || {};
        const uid = request.auth.uid;
        const checkoutTarget = resolveCheckoutReturnTarget(returnBaseUrl);
        const returnOrigin = checkoutTarget.origin || 'https://karaoke.unodev.com.br';
        const stripe = new Stripe(STRIPE_SECRET_KEY.value());

        const plans = {
            'avulso3h':   { name: 'Avulso 3h',         price: 1000,  hours: 3,   mode: 'payment' },
            'avulso8h':   { name: 'Avulso 8h',         price: 1500,  hours: 8,   mode: 'payment' },
            'avulso24h':  { name: 'Avulso 24h',        price: 2500,  hours: 24,  mode: 'payment' },
            'avulso48h':  { name: 'Avulso 48h',        price: 3500,  hours: 48,  mode: 'payment' },
            'casual':     { name: 'Plano Casual',      price: 4000,  days: 30,   mode: 'payment' },
            'festa':      { name: 'Plano Festa',       price: 9900,  days: 90,   mode: 'payment' },
            'semestral':  { name: 'Plano Semestral',   price: 18900, days: 180,  mode: 'payment' },
            'anual':      { name: 'Plano Anual',       price: 34900, days: 365,  mode: 'payment' }
        };

        const plan = plans[planId];
        if (!plan) throw new HttpsError('invalid-argument', 'Plano inválido.');

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: { name: plan.name },
                        unit_amount: plan.price,
                        // Se for assinatura, o Stripe exige um intervalo recursivo
                        ...(plan.mode === 'subscription' && {
                            recurring: { interval: planId === 'anual' ? 'year' : (planId === 'festa' ? 'month' : 'month'), interval_count: planId === 'festa' ? 3 : 1 }
                        })
                    },
                    quantity: 1,
                }],
                mode: plan.mode,
                success_url: `${returnOrigin}${checkoutTarget.successPath}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${returnOrigin}${checkoutTarget.cancelPath}`,
                client_reference_id: uid, 
                metadata: { 
                    uid: uid, 
                    planId: planId, 
                    days: plan.days || 0,
                    hours: plan.hours || 0
                }
            });

            return { url: session.url };
        } catch (error) {
            console.error('Erro Stripe:', error);
            throw new HttpsError('internal', error.message);
        }
    }
);

exports.stripeWebhook = onRequest(
    { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, 
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const stripe = new Stripe(STRIPE_SECRET_KEY.value());
        const endpointSecret = STRIPE_WEBHOOK_SECRET.value();

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const uid = session.client_reference_id || session.metadata.uid;
            const planId = session.metadata.planId;
            const days = parseInt(session.metadata.days || 0);
            const hours = parseInt(session.metadata.hours || 0);

            if (uid && planId) {
                let expirationDate;
                if (days > 0) {
                    expirationDate = Date.now() + (days * 24 * 60 * 60 * 1000);
                } else if (hours > 0) {
                    expirationDate = Date.now() + (hours * 60 * 60 * 1000);
                }

                const planNames = {
                    casual: 'Casual', festa: 'Festa', semestral: 'Semestral', anual: 'Anual',
                    avulso3h: 'Avulso 3h', avulso8h: 'Avulso 8h',
                    avulso24h: 'Avulso 24h', avulso48h: 'Avulso 48h'
                };

                await admin.database().ref(`users/${uid}/subscription`).update({
                    active: true,
                    status: 'active',
                    plan: planNames[planId] || planId,
                    expiresAt: expirationDate,
                    lastUpdate: admin.database.ServerValue.TIMESTAMP,
                    paymentId: session.id,
                    mode: session.mode
                });
            }
        }
        res.status(200).json({ received: true });
    }
);
