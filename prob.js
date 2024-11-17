/* https://github.com/42nd/FastestGenshinProb (v1.1) */

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
    if (N <= 72) { // ~73: 0.6%
        P = 0.006;
    } else if (N >= 89) {
        P = 1.0;
    } else {
        P = 0.006 + 0.06 * (N - 72);
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
 * @param {boolean} arrayReturn - Whether to return an array of probabilities from 1st to 'target_C'th pull.
 * @returns {number | Array} - The probability (in percent) of obtaining exactly 'target_C' featured characters.
 */
function exactlyC(N, G, P, target_C, arrayReturn=false) {
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

    let probabilityArray = [];

    for (let k = 0; k < P; k++) {
        let next_states = new Map();
        let total_prob_at_k = 0.0;

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
            const prob_not_5star = prob * P_not_5star;
            next_states.set(
                next_key_not_5star,
                (next_states.get(next_key_not_5star) || 0) + prob_not_5star
            );
            if (c === target_C) {
                total_prob_at_k += prob_not_5star;
            }
            let next_c, next_key_featured;
            if (g === 0) {
                const next_key_non_featured = encodeState(0, 1, c);
                const prob_non_featured = prob * P_5star * 0.5;
                next_states.set(
                    next_key_non_featured,
                    (next_states.get(next_key_non_featured) || 0) + prob_non_featured
                );
                if (c === target_C) {
                    total_prob_at_k += prob_non_featured;
                }
                next_c = Math.min(c + 1, target_C + 1);
                next_key_featured = encodeState(0, 0, next_c);
                const prob_featured = prob * P_5star * 0.5;
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob_featured
                );
                if (next_c === target_C) {
                    total_prob_at_k += prob_featured;
                }
            } else {
                next_c = Math.min(c + 1, target_C + 1);
                next_key_featured = encodeState(0, 0, next_c);
                const prob_featured = prob * P_5star;
                next_states.set(
                    next_key_featured,
                    (next_states.get(next_key_featured) || 0) + prob_featured
                );
                if (next_c === target_C) {
                    total_prob_at_k += prob_featured;
                }
            }
        }
        current_states = next_states;

        if (arrayReturn) {
            probabilityArray.push(total_prob_at_k * 100);
        }
    }

    if (arrayReturn) {
        return probabilityArray;
    } else {
        let total_prob = 0.0;
        for (const [state_key, prob] of current_states) {
            const c = Number(state_key % 10n);
            if (c === target_C) {
                total_prob += prob;
            }
        }
        return total_prob * 100;
    }
}

/**
 * Calculates the probability of obtaining exactly 'cur_C + 1' ~ 'target_C' featured characters in the next 'P' pulls.
 *
 * @param {number} N - Current pity count (number of pulls since last 5-star).
 * @param {boolean} G - Guaranteed featured character flag (false: 50/50, true: guaranteed).
 * @param {number} P - Number of pulls to be made.
 * @param {number} cur_C - [-1~6] Current eidolon level.
 * @param {number} target_C - [0~6] Desired eidolon level.
 * @returns {Array} - The probability (in percent) of obtaining exactly 'cur_C + 1' ~ 'target_C' featured characters.
 */
function P_constell_probabilities(N, G, K, cur_C, target_C) {
    const P_5star_cache = {};

    function encodeState(n, g, c) {
        return BigInt(n) * 100n + BigInt(g) * 10n + BigInt(c);
    }

    let current_states = new Map();
    const initial_key = encodeState(N, G ? 1 : 0, 0n);
    current_states.set(initial_key, 1.0);

    const max_c = target_C - cur_C;

    let probabilities = new Array(max_c + 1).fill(0.0);

    for (let k = 0; k < K; k++) {
        let next_states = new Map();

        for (const [state_key, prob] of current_states) {
            if (prob < 1e-12) continue;

            const n = Number(state_key / 100n);
            const g = Number((state_key / 10n) % 10n);
            const c = Number(state_key % 10n);

            if (c > max_c) continue;

            const P_5star = singleProb(n, P_5star_cache);
            const P_not_5star = 1 - P_5star;

            const next_n = Math.min(n + 1, 89);
            const next_key_not_5star = encodeState(next_n, g, c);
            const prob_not_5star = prob * P_not_5star;
            next_states.set(
                next_key_not_5star,
                (next_states.get(next_key_not_5star) || 0) + prob_not_5star
            );

            if (k === K - 1 && c >= 1 && c <= max_c) {
                probabilities[c] += prob_not_5star;
            }

            if (P_5star > 0) {
                if (g === 0) {
                    const next_key_non_featured = encodeState(0, 1, c);
                    const prob_non_featured = prob * P_5star * 0.5;
                    next_states.set(
                        next_key_non_featured,
                        (next_states.get(next_key_non_featured) || 0) + prob_non_featured
                    );

                    if (k === K - 1 && c >= 1 && c <= max_c) {
                        probabilities[c] += prob_non_featured;
                    }

                    const next_c = Math.min(c + 1, max_c);
                    const next_key_featured = encodeState(0, 0, next_c);
                    const prob_featured = prob * P_5star * 0.5;
                    next_states.set(
                        next_key_featured,
                        (next_states.get(next_key_featured) || 0) + prob_featured
                    );
                    if (k === K - 1 && next_c >= 1 && next_c <= max_c) {
                        probabilities[next_c] += prob_featured;
                    }
                } else {
                    const next_c = Math.min(c + 1, max_c);
                    const next_key_featured = encodeState(0, 0, next_c);
                    const prob_featured = prob * P_5star;
                    next_states.set(
                        next_key_featured,
                        (next_states.get(next_key_featured) || 0) + prob_featured
                    );
                    if (k === K - 1 && next_c >= 1 && next_c <= max_c) {
                        probabilities[next_c] += prob_featured;
                    }
                }
            }
        }

        current_states = next_states;
    }
    for (let c = 1; c <= max_c; c++) {
        probabilities[c] *= 100;
    }
    let result = [];
    for (let c = 1; c <= max_c; c++) {
        const constellation_level = cur_C + c;
        result.push({
            constellationLevel: constellation_level,
            probability: probabilities[c],
        });
    }

    return result;
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
