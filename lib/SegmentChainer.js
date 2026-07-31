import * as r from './rational.js';
import { pointLabel, segLabel } from '../test.js';

/**
 * @import { SegmentBool } from './Segment.js'
 */
/**
 * @typedef {[number, number]} Vec2
 */

/**
 * @param {SegmentBool[]} segments
 * @param {number} [epsilon]
 * @returns {Vec2[][]}
 */
export function polygon(segments, epsilon = 0) {
	/** @type {Vec2[][]} */
	const chains = [];
	/** @type {Vec2[][]} */
	const regions = [];

	for (const segb of segments) {
		console.log('Chains:', chains.map(chain => chain.map(pointLabel).join(',')));
		console.log(`Segment ${segLabel(segb.data)}`);

		/** @type {[Vec2, Vec2]} */
		const seg = segb.myFill.above
			? [vecToFloat(segb.data.p0), vecToFloat(segb.data.p1)]
			: [vecToFloat(segb.data.p1), vecToFloat(segb.data.p0)];

		/** @type {number | undefined} */
		let startMatch;
		/** @type {number | undefined} */
		let endMatch;

		for (let i = 0; i < chains.length; i++) {
			const chain = chains[i];

			if (startMatch == null && isEqualVec2(chain[chain.length - 1], seg[0])) {
				startMatch = i;
			}

			if (endMatch == null && isEqualVec2(chain[0], seg[1])) {
				endMatch = i;
			}

			if (startMatch != null && endMatch != null) {
				break;
			}
		}

		console.log(`Start match: ${startMatch != null ? chains[startMatch].map(pointLabel) : ''}`);
		console.log(`End match: ${endMatch != null ? chains[endMatch].map(pointLabel) : ''}`);

		if (startMatch != null && endMatch != null) {
			// index1 gets index2 appended to it, and index2 is removed
			const chain1 = chains[startMatch];
			const chain2 = chains[endMatch];

			if (isCollinear(chain1[chain1.length - 2], chain1[chain1.length - 1], chain2[0], epsilon)) {
				chain1.pop();
			}

			// if chain2.length < 2, it means that startMatch === endMAtch and the last element
			// was popped in the previous condition
			if (chain2.length >= 2
				&& isCollinear(chain1[chain1.length - 1], chain2[0], chain2[1], epsilon)) {
				chain2.shift();
			}

			if (startMatch === endMatch) {
				// we have a closed chain!
				if (chain1.length >= 3) {
					regions.push(chain1);
				}
			} else {
				chains[startMatch] = chain1.concat(chain2);
			}

			chains.splice(endMatch, 1);
		} else if (startMatch != null) {
			const chain = chains[startMatch];

			if (isCollinear(chain[chain.length - 2], chain[chain.length - 1], seg[1], epsilon)) {
				[, chain[chain.length - 1]] = seg;
			} else {
				chain.push(seg[1]);
			}
		} else if (endMatch != null) {
			const chain = chains[endMatch];

			if (isCollinear(seg[0], chain[0], chain[1], epsilon)) {
				[chain[0]] = seg;
			} else {
				chain.unshift(seg[0]);
			}
		} else {
			// we didn't match anything, so create a new chain
			chains.push([seg[0], seg[1]]);
		}
	}

	if (chains.length !== 0) {
		throw new Error('Open chains left');
	}

	return regions;
}

/**
 * @param {Vec2} a
 * @param {Vec2} b
 * @returns {boolean}
 */
function isEqualVec2(a, b) {
	return a[0] === b[0] && a[1] === b[1];
}

/**
 * @param {Vec2} p1
 * @param {Vec2} p2
 * @param {Vec2} p3
 * @param {number} epsilon
 * @returns {boolean}
 */
function isCollinear(p1, p2, p3, epsilon) {
	if (epsilon < 0) {
		return false;
	}

	const orientatation = orient2d(p1, p2, p3);

	return Math.abs(orientatation) <= epsilon;
}

/**
 * Direction of p1 related to line p2->p3.
 *   +1 - p1 is CCW (left) of the directed line p2->p3
 *   -1 - p1 is CW (right) of the directed line p2->p3
 *    0 - p1, p2, p3 are exactly collinear
 * @param {Vec2} p1
 * @param {Vec2} p2
 * @param {Vec2} p3
 * @returns {number}
 */
function orient2d(p1, p2, p3) {
	const dx1 = p1[0] - p2[0];
	const dy1 = p1[1] - p2[1];
	const dx2 = p2[0] - p3[0];
	const dy2 = p2[1] - p3[1];

	return dx1 * dy2 - dx2 * dy1;
}

/**
 * @param {[r.Rational, r.Rational]} vec
 * @returns {Vec2}
 */
function vecToFloat(vec) {
	return [r.toNumber(vec[0]), r.toNumber(vec[1])];
}
