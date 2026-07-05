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
	const exp = Number((bits >> 52n) & 0x7FFn);
	let mantissa = bits & ((1n << 52n) - 1n);
	let denominator = 1n;

	if (exp === 0) {
		denominator <<= BigInt(1074);
	} else {
		mantissa |= 1n << 52n;

		if (exp >= 1075) {
			mantissa <<= BigInt(exp - 1075);
		} else {
			denominator <<= BigInt(1075 - exp);
		}
	}

	return _simplify(
		bits & 0x8000000000000000n ? -mantissa : mantissa,
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
 * @param {Rational} a
 * @param {Rational} b
 * @returns {-1 | 0 | 1}
 */
export function cmp(a, b) {
	const { n: an, d: ad } = a;
	const { n: bn, d: bd } = b;

	const p = an * bd;
	const q = bn * ad;

	// eslint-disable-next-line no-nested-ternary
	return p < q ? -1 : p > q ? 1 : 0;
}

/**
 * @param {Rational} a
 * @returns {-1 | 0 | 1}
 */
export function cmp0(a) {
	const { n: an } = a;

	// eslint-disable-next-line no-nested-ternary
	return an < 0n ? -1 : an > 0n ? 1 : 0;
}

/**
 * @param {Rational} a
 * @returns {-1 | 0 | 1}
 */
export function cmp1(a) {
	const { n: an, d: ad } = a;

	// eslint-disable-next-line no-nested-ternary
	return an < ad ? -1 : an > ad ? 1 : 0;
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {boolean}
 */
export function eq(a, b) {
	return cmp(a, b) === 0;
}

/**
 * @param {Rational} a
 * @returns {boolean}
 */
export function eq0(a) {
	return cmp0(a) === 0;
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {boolean}
 */
export function lte(a, b) {
	return cmp(a, b) <= 0;
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {boolean}
 */
export function gte(a, b) {
	return cmp(a, b) >= 0;
}

/**
 * @param {Rational} a
 * @param {Rational} b
 * @returns {boolean}
 */
export function lt(a, b) {
	return cmp(a, b) < 0;
}

/**
 * @param {Rational} a
 * @param {Rational} b
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

	if (negative) {
		a = -a;
	}

	/* eslint-disable no-bitwise */
	let exponent = Math.max(a.toString(2).length - b.toString(2).length - 53, -1074);

	let mantissa;
	let remainder;
	let den;

	for (;;) {
		const num = exponent < 0 ? a << BigInt(-exponent) : a;
		den = exponent > 0 ? b << BigInt(exponent) : b;

		mantissa = num / den;
		remainder = num % den;

		if (exponent > -1074 && mantissa >> 53n !== 0n) {
			exponent++; // estimate too low, mantissa too wide
		} else if (exponent > -1074 && mantissa >> 52n === 0n) {
			exponent--; // estimate too high, keep 53 bits of precision
		} else {
			break;
		}
	}

	// Round to nearest, ties to even, using the remainder as round + sticky.
	const twiceRemainder = remainder * 2n;

	if (twiceRemainder > den || (twiceRemainder === den && (mantissa & 1n) === 1n)) {
		mantissa++;

		if (mantissa >> 53n !== 0n) {
			mantissa >>= 1n; // rounding carried into a new bit
			exponent++;
		}
	}

	/* eslint-enable no-bitwise */

	if (exponent > 971) {
		return negative ? -Infinity : Infinity;
	}

	const result = Number(mantissa) * 2 ** exponent;

	return negative ? -result : result;
}
