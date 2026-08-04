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

	/**
	 * @param {number} [bits]
	 */
	toString(bits) {
		return toString(this, bits);
	}

	[Symbol.for('nodejs.util.inspect.custom')]() {
		return `Rational(${toString(this)})`;
	}
}

/**
 * Round the exact positive value a/b to `precision` significant binary bits,
 * returning `{ mantissa, exponent }` such that the value is
 * `mantissa * 2 ** exponent` with `mantissa` in `[2**(precision-1), 2**precision)`.
 * Correctly rounded to nearest, ties to even. This is the unbounded-exponent
 * core of `divideBigInts` (no double overflow/subnormal clamping).
 *
 * @param {bigint} a positive
 * @param {bigint} b positive
 * @param {number} precision
 * @returns {{ mantissa: bigint, exponent: number }}
 */
function roundedBinary(a, b, precision) {
	/* eslint-disable no-bitwise */
	const p = BigInt(precision);

	let exponent = a.toString(2).length - b.toString(2).length - precision;
	let mantissa;
	let remainder;
	let den;

	for (;;) {
		const num = exponent < 0 ? a << BigInt(-exponent) : a;

		den = exponent > 0 ? b << BigInt(exponent) : b;
		mantissa = num / den;
		remainder = num % den;

		if (mantissa >> p !== 0n) {
			exponent++; // mantissa too wide
		} else if (mantissa >> (p - 1n) === 0n) {
			exponent--; // mantissa too narrow
		} else {
			break;
		}
	}

	const twiceRemainder = remainder * 2n;

	if (twiceRemainder > den || (twiceRemainder === den && (mantissa & 1n) === 1n)) {
		mantissa++;

		if (mantissa >> p !== 0n) {
			mantissa >>= 1n;
			exponent++;
		}
	}

	/* eslint-enable no-bitwise */

	return { mantissa, exponent };
}

/**
 * Assemble the significant digits and decimal point position into a string,
 * following the ECMAScript `Number.prototype.toString` formatting rules
 * (fixed notation for point positions in `(-6, 21]`, exponential otherwise).
 *
 * @param {string} digits significant digits, no leading/trailing zeros
 * @param {number} pointPos number of digits before the decimal point
 * @returns {string}
 */
function formatDecimal(digits, pointPos) {
	const { length } = digits;

	if (pointPos > 0 && pointPos <= 21) {
		if (length <= pointPos) {
			return digits + '0'.repeat(pointPos - length);
		}

		return `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
	}

	if (pointPos > -6 && pointPos <= 0) {
		return `0.${'0'.repeat(-pointPos)}${digits}`;
	}

	const exponent = pointPos - 1;
	const mantissa = length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;

	return `${mantissa}e${exponent >= 0 ? '+' : '-'}${Math.abs(exponent)}`;
}

/**
 * Render `a` as the shortest decimal string that round-trips through a
 * `bits`-bit binary floating point approximation of the exact value. In other
 * words, `a` is first rounded to `bits` significant binary bits (as in
 * `divideBigInts`), then the fewest decimal digits that uniquely identify that
 * binary value are emitted (free-format Dragon4, in exact bigint arithmetic).
 *
 * @param {Rational} a
 * @param {number} [bits]
 * @returns {string}
 */
export function toString(a, bits = 128) {
	let { n } = a;
	const { d } = a;

	if (n === 0n) {
		return '0';
	}

	/* eslint-disable no-bitwise */

	let sign = '';

	if (n < 0n) {
		sign = '-';
		n = -n;
	}

	// Correctly-rounded bits-bit float: value = mantissa * 2 ** exponent.
	const { mantissa, exponent } = roundedBinary(n, d, bits);

	// A decimal exactly on a rounding boundary is captured by our float only
	// when its mantissa is even (ties to even), so boundaries are inclusive iff
	// the mantissa is even.
	const even = (mantissa & 1n) === 0n;

	// Set up an exact fraction R / S for the value together with the half-gaps
	// to the neighbouring bits-bit floats (deltaPlus above, deltaMinus below).
	// When the mantissa is a power of two the gap below is half the gap above.
	const unequalGaps = mantissa === 1n << BigInt(bits - 1);

	let r;
	let s;
	let deltaPlus;
	let deltaMinus;

	if (exponent >= 0) {
		const scale = 1n << BigInt(exponent);

		if (unequalGaps) {
			r = mantissa * scale * 4n;
			s = 4n;
			deltaPlus = scale * 2n;
			deltaMinus = scale;
		} else {
			r = mantissa * scale * 2n;
			s = 2n;
			deltaPlus = scale;
			deltaMinus = scale;
		}
	} else if (unequalGaps) {
		r = mantissa * 4n;
		s = 1n << BigInt(2 - exponent);
		deltaPlus = 2n;
		deltaMinus = 1n;
	} else {
		r = mantissa * 2n;
		s = 1n << BigInt(1 - exponent);
		deltaPlus = 1n;
		deltaMinus = 1n;
	}

	/* eslint-enable no-bitwise */

	// Scale by a power of ten so that R / S lands in [1/10, 1); pointPos is the
	// position of the decimal point (digits before it). The estimate from the
	// bit lengths is only approximate, so two fixup loops make it exact.
	let pointPos = Math.ceil((mantissa.toString(2).length + exponent) * Math.log10(2));

	if (pointPos >= 0) {
		s *= 10n ** BigInt(pointPos);
	} else {
		const scale = 10n ** BigInt(-pointPos);

		r *= scale;
		deltaPlus *= scale;
		deltaMinus *= scale;
	}

	while (r >= s) {
		s *= 10n;
		pointPos++;
	}

	while (r * 10n < s) {
		r *= 10n;
		deltaPlus *= 10n;
		deltaMinus *= 10n;
		pointPos--;
	}

	// Emit digits until the generated prefix alone pins the value down within
	// its rounding interval (Dragon4 termination), then round the final digit.
	const digits = [];

	for (;;) {
		r *= 10n;
		deltaPlus *= 10n;
		deltaMinus *= 10n;

		let digit = r / s;

		r %= s;

		const low = even ? r <= deltaMinus : r < deltaMinus;
		const high = even ? r + deltaPlus >= s : r + deltaPlus > s;

		if (low || high) {
			if (low && high) {
				const twiceR = r * 2n;

				if (twiceR > s || (twiceR === s && digit % 2n === 1n)) {
					digit++;
				}
			} else if (high) {
				digit++;
			}

			digits.push(digit);
			break;
		}

		digits.push(digit);
	}

	// Propagate a carry if the final digit rounded up to ten.
	for (let i = digits.length - 1; digits[i] === 10n; i--) {
		digits[i] = 0n;

		if (i === 0) {
			digits.unshift(1n);
			pointPos++;
			break;
		}

		digits[i - 1]++;
	}

	// Trailing zeros are never significant, drop them.
	while (digits.length > 1 && digits[digits.length - 1] === 0n) {
		digits.pop();
	}

	return sign + formatDecimal(digits.join(''), pointPos);
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
