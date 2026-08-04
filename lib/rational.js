export class Rational {
	/** @readonly @type {bigint} */
	n;

	/** @readonly @type {bigint} */
	d;

	/**
	 * @param {bigint} n
	 * @param {bigint} d
	 */
	constructor(n, d) {
		this.n = n;
		this.d = d;
	}

	valueOf() {
		return toNumber(this);
	}

	toString() {
		return `${toNumber(this)}`;
	}

	[Symbol.for('nodejs.util.inspect.custom')]() {
		return `Rational(${toNumber(this)})`;
	}
}

/**
 * @param {number} n
 * @returns {Rational}
 */
export function rational(n) {
	if (Number.isInteger(n)) {
		return new Rational(BigInt(n), 1n);
	}

	const buffer = new ArrayBuffer(8);
	const view = new DataView(buffer);
	view.setFloat64(0, n);

	const bits = view.getBigUint64(0);

	/* eslint-disable no-bitwise */
	const exponent = Number((bits >> 52n) & 0x7FFn);
	const fraction = bits & ((1n << 52n) - 1n);

	let mantissa;
	let exp;

	if (exponent === 0) {
		// Subnormal
		mantissa = fraction;
		exp = -1074;
	} else {
		mantissa = (1n << 52n) | fraction;
		exp = exponent - 1075;
	}

	let numerator;
	let denominator;

	if (exp >= 0) {
		numerator = mantissa << BigInt(exp);
		denominator = 1n;
	} else {
		numerator = mantissa;
		denominator = 1n << BigInt(-exp);
	}

	return _simplify(
		bits & 0x8000000000000000n ? -numerator : numerator,
		denominator,
	);
	/* eslint-enable */
}

/**
 * @param {Rational} a
 * @returns {Rational}
 */
export function simplify(a) {
	const { n, d } = a;

	return _simplify(n, d);
}

/**
 * @param {bigint} n
 * @param {bigint} d
 * @returns {Rational}
 */
function _simplify(n, d) {
	if (n === 0n) {
		return new Rational(0n, 1n);
	}

	// normalize the sign so the denominator is always positive
	let a = n < 0n ? -n : n;
	let b = d;

	while (b !== 0n) {
		const t = a % b;
		a = b;
		b = t;
	}

	return new Rational(n / a, d / a);
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {Rational}
 */
export function plus(a, b) {
	const { n: an, d: ad } = a;
	const { n: bn, d: bd } = b;

	if (ad === bd) {
		return new Rational(an + bn, ad);
	}

	return new Rational(an * bd + bn * ad, ad * bd);
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {Rational}
 */
export function minus(a, b) {
	const { n: an, d: ad } = a;
	const { n: bn, d: bd } = b;

	if (ad === bd) {
		return new Rational(an - bn, ad);
	}

	return new Rational(an * bd - bn * ad, ad * bd);
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {Rational}
 */
export function times(a, b) {
	const { n: an, d: ad } = a;
	const { n: bn, d: bd } = b;

	return new Rational(an * bn, ad * bd);
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {Rational}
 */
export function div(a, b) {
	const { n: an, d: ad } = a;
	const { n: bn, d: bd } = b;

	const n = an * bd;
	const d = ad * bn;

	return d < 0n ? new Rational(-n, -d) : new Rational(n, d);
}

/**
 * @param {Rational} a
 * @returns {Rational}
 */
export function neg(a) {
	const { n, d } = a;

	return new Rational(-n, d);
}

/**
 * @param {Rational} a
 * @returns {Rational}
 */
export function abs(a) {
	const { n, d } = a;

	return new Rational(
		n < 0 ? -n : n,
		d < 0 ? -d : d,
	);
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {-1 | 0 | 1}
 */
export function cmp(a, b) {
	const { n: an, d: ad } = typeof a === 'number' ? rational(a) : a;
	const { n: bn, d: bd } = typeof b === 'number' ? rational(b) : b;

	const p = an * bd;
	const q = bn * ad;

	// eslint-disable-next-line no-nested-ternary
	return p < q ? -1 : p > q ? 1 : 0;
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {boolean}
 */
export function eq(a, b) {
	return cmp(a, b) === 0;
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {boolean}
 */
export function lte(a, b) {
	return cmp(a, b) <= 0;
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {boolean}
 */
export function gte(a, b) {
	return cmp(a, b) >= 0;
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {boolean}
 */
export function lt(a, b) {
	return cmp(a, b) < 0;
}

/**
 * @param {number | Rational} a
 * @param {number | Rational} b
 * @returns {boolean}
 */
export function gt(a, b) {
	return cmp(a, b) > 0;
}

/**
 * @param {Rational} a
 */
export function toNumber(a) {
	const { n, d } = a;

	return divideBigInts(n, d);
}

/**
 * @param {bigint} a
 * @param {bigint} b
 * @returns {number}
 */
function divideBigInts(a, b) {
	if (a === 0n) {
		return 0;
	}

	const negative = a < 0n;
	const numerator = negative ? -a : a;
	const denominator = b;

	// --- Helpers ----------------------------------------------------------

	const MANT_BITS = 53; // significant bits of an IEEE double
	const MAX_E = 971; // exponent giving the largest finite double: (2^53-1)*2^971
	const MIN_E = -1074; // exponent of the smallest subnormal (mantissa=1)

	/**
	 * Given a candidate binary exponent E, compute the integer mantissa M
	 * such that M is numerator/denominator/2^E rounded to the nearest
	 * integer, ties rounding to even. (M is *not* necessarily normalized
	 * to 53 bits here — the caller adjusts E until it is, except in the
	 * subnormal range where E is pinned at MIN_E.)
	 *
	 * @param {number} E
	 * @returns {bigint}
	 */
	function roundedMantissaAt(E) {
		let num = numerator;
		let den = denominator;

		if (E <= 0) {
			// eslint-disable-next-line no-bitwise
			num = numerator << BigInt(-E);
		} else {
			// eslint-disable-next-line no-bitwise
			den = denominator << BigInt(E);
		}

		let q = num / den;
		const r = num % den;

		if (r !== 0n) {
			const twiceR = r * 2n;

			if (twiceR > den) {
				q += 1n;
			} else if (twiceR === den) {
				// ties to even
				if (q % 2n === 1n) {
					q += 1n;
				}
			}
		}

		return q;
	}

	// Initial guess for the exponent, assuming a full 53-bit mantissa.
	// numerator/denominator lies in (2^(na-nb-1), 2^(na-nb+1)), so this
	// guess is correct to within +/-1, which the loop below fixes up.
	let E = numerator.toString(2).length - denominator.toString(2).length - MANT_BITS;

	if (E < MIN_E) {
		// clamp straight to the subnormal exponent
		E = MIN_E;
	}

	let q = roundedMantissaAt(E);
	let qLen = q === 0n ? 0 : q.toString(2).length;

	// Adjust E until the mantissa has exactly MANT_BITS bits (normal
	// range), or E has bottomed out at MIN_E (subnormal / underflow range,
	// where fewer than 53 bits is expected and fine).
	while (true) {
		if (qLen > MANT_BITS) {
			E++;
		} else if (qLen < MANT_BITS && E > MIN_E) {
			E--;
		} else {
			break;
		}

		q = roundedMantissaAt(E);
		qLen = q === 0n ? 0 : q.toString(2).length;
	}

	// Overflow: true value's magnitude exceeds the largest finite double.
	if (E > MAX_E) {
		return negative ? -Infinity : Infinity;
	}

	// q now fits in <=53 bits and is exact (no further rounding needed):
	// Number(q) is exact because q <= 2^53 - 1 < 2^53.
	const mantissaNum = Number(q);
	const result = mantissaNum * 2 ** E;

	return negative ? -result : result;
}
