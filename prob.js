/* https://github.com/42nd/FastestGenshinProb (v1.0) */

/**
 * Calculates the probability of obtaining a 5-star character in the next(N+1th) pull.
 *
 * @param {number} N - Current pity count (number of pulls since last 5-star).
 * @param {Object} cache - An array for caching computed probabilities. If you don't know what this is, just leave it blank.
 * @returns {number} - The probability of getting a 5-star character in the next pull.
 */
function singleProb(N, cache=[]) {
    if (cache[N] !== undefined) {
        return cache[N];
    }
    let P;
    if (N <= 72) {
        P = 0.006; // 0.6%
    } else if (N >= 89) {
        P = 1.0;   // 100%
    } else {
        P = 0.006 + 0.06 * (N - 72); // Increases by 6% each pull
    }
    cache[N] = P;
    return P;
}

/**
 * Calculates the probability of obtaining exactly 'target_C' featured characters in the next 'P' pulls.
 *
 * @param {number} N - Current pity count (number of pulls since last 5-star).
 * @param {boolean} G - Guaranteed featured character flag (false: 50/50, true: guaranteed).
 * @param {number} P - Number of pulls to be made.
 * @param {number} target_C - [1~7] Desired number of featured characters to obtain.
 * @returns {number} - The probability (in percent) of obtaining exactly 'target_C' featured characters.
 */
function exactlyC(N, G, P, target_C) {
    if (target_C < 1 || target_C > 7) {
        throw new Error("target_C must be between 1 and 7.");
    }
    const P_5star_cache = {};

    function encodeState(n, g, c) {
        return BigInt(n) * 100n + BigInt(g) * 10n + BigInt(c);
    }

    let current_states = new Map();
    const initial_key = encodeState(N, G ? 1 : 0, 0n);
    current_states.set(initial_key, 1.0);

    for (let k = 0; k < P; k++) {
        let next_states = new Map();
        for (const [state_key, prob] of current_states) {
            if (prob < 1e-12) continue;

            const n = Number(state_key / 100n);
            const g = Number((state_key / 10n) % 10n);
            const c = Number(state_key % 10n);
            if (c > target_C) continue;

            const P_5star = singleProb(n, P_5star_cache);
            const P_not_5star = 1 - P_5star;

            const next_n = Math.min(n + 1, 89);
            const next_key_not_5star = encodeState(next_n, g, c);
            next_states.set(
                next_key_not_5star,
                (next_states.get(next_key_not_5star) || 0) + prob * P_not_5star
            );

            let next_c, next_key_featured;
            if (g === 0) {
                const next_key_non_featured = encodeState(0, 1, c);
                next_states.set(
                    next_key_non_featured,
                    (next_states.get(next_key_non_featured) || 0) + prob * P_5star * 0.5
                );
                next_c = Math.min(c + 1, target_C + 1);
                next_key_featured = encodeState(0, 0, next_c);
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob * P_5star * 0.5
                );
            } else {
                next_c = Math.min(c + 1, target_C + 1);
                next_key_featured = encodeState(0, 0, next_c);
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob * P_5star
                );
            }
        }
        current_states = next_states;
    }

    let total_prob = 0.0;
    for (const [state_key, prob] of current_states) {
        const c = Number(state_key % 10n);
        if (c === target_C) {
            total_prob += prob;
        }
    }

    return total_prob * 100;
}

/**
 * Calculates the probability of obtaining at least 'target_C' featured characters in the next 'P' pulls.
 *
 * @param {number} N - Current pity count (number of pulls since last 5-star).
 * @param {boolean} G - Guaranteed featured character flag (false: 50/50, true: guaranteed).
 * @param {number} P - Number of pulls to be made.
 * @param {number} target_C - [1~7] Minimum number of featured characters to obtain.
 * @returns {number} - The probability (in percent) of obtaining at least 'target_C' featured characters.
 */
function atLeastC(N, G, P, target_C) {
    if (target_C < 1 || target_C > 7) {
        throw new Error("target_C must be between 1 and 7.");
    }
    const P_5star_cache = {};

    function encodeState(n, g, c) {
        return BigInt(n) * 100n + BigInt(g) * 10n + BigInt(c);
    }

    let current_states = new Map();
    const initial_key = encodeState(N, G ? 1 : 0, 0n);
    current_states.set(initial_key, 1.0);

    const max_possible_C = Math.min(Math.floor(P / 10), 7);

    for (let k = 0; k < P; k++) {
        let next_states = new Map();
        for (const [state_key, prob] of current_states) {
            const n = Number(state_key / 100n);
            const g = Number((state_key / 10n) % 10n);
            const c = Number(state_key % 10n);
            if (c > max_possible_C) continue;

            const P_5star = singleProb(n, P_5star_cache);
            const P_not_5star = 1 - P_5star;

            const next_n = Math.min(n + 1, 89);
            const next_key_not_5star = encodeState(next_n, g, c);
            next_states.set(
                next_key_not_5star,
                (next_states.get(next_key_not_5star) || 0) + prob * P_not_5star
            );

            let next_c, next_key_featured;
            if (g === 0) {
                const next_key_non_featured = encodeState(0, 1, c);
                next_states.set(
                    next_key_non_featured,
                    (next_states.get(next_key_non_featured) || 0) + prob * P_5star * 0.5
                );
                next_c = Math.min(c + 1, max_possible_C);
                next_key_featured = encodeState(0, 0, next_c);
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob * P_5star * 0.5
                );
            } else {
                next_c = Math.min(c + 1, max_possible_C);
                next_key_featured = encodeState(0, 0, next_c);
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob * P_5star
                );
            }
        }
        current_states = next_states;
    }

    let total_prob = 0.0;
    for (const [state_key, prob] of current_states) {
        const c = Number(state_key % 10n);
        if (c >= target_C) {
            total_prob += prob;
        }
    }

    return total_prob * 100;
}
