import * as r from './rational.js';
import { sweep } from './Intersecter.js';
import { SegmentBool } from './Segment.js';
import { polygon } from './SegmentChainer.js';
import * as selectors from './SegmentSelector.js';

export * from './Segment.js';
export * from './Intersecter.js';
export { polygon, selectors };

/**
 * @import { Vec2 } from './polybool.js'
 */

/**
 * @param {Vec2<number>[][]} regions
 * @returns {SegmentBool[]}
 */
export function segments(regions) {
	const segments = [];

	for (const region of regions) {
		let lastPoint = region[region.length - 1];

		for (const point of region) {
			const f = lastPoint[0] - point[0] || lastPoint[1] - point[1];

			if (f !== 0) {
				segments.push(new SegmentBool({
					p0: vecToRational(f < 0 ? lastPoint : point),
					p1: vecToRational(f < 0 ? point : lastPoint),
				}));
				lastPoint = point;
			}
		}
	}

	return sweep(segments, true);
}

/** @type {WeakMap<Vec2<number>, Vec2>} */
const floatVectorCache = new WeakMap();

/**
 * @param {Vec2<number>} vec
 * @returns {Vec2}
 */
function vecToRational(vec) {
	const existing = floatVectorCache.get(vec);

	if (existing != null) {
		return existing;
	}

	/** @type {Vec2} */
	const result = [r.rational(vec[0]), r.rational(vec[1])];

	floatVectorCache.set(vec, result);

	return result;
}

/**
 * @param {SegmentBool[]} segments1
 * @param {SegmentBool[]} segments2
 * @returns {SegmentBool[]}
 */
export function combine(segments1, segments2) {
	const segments = [];

	for (const seg of segments1) {
		segments.push(new SegmentBool(seg.data, seg.myFill, true));
	}

	for (const seg of segments2) {
		segments.push(new SegmentBool(seg.data, seg.myFill, false));
	}

	return sweep(segments, false);
}

/**
 * @param {Vec2<number>[][]} regions
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function normalize(regions, epsilon) {
	return polygon(segments(regions), epsilon);
}

/**
 * @param {Vec2<number>[][]} poly1
 * @param {Vec2<number>[][]} poly2
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function union(poly1, poly2, epsilon) {
	const seg1 = segments(poly1);
	const seg2 = segments(poly2);
	const comb = combine(seg1, seg2);
	const seg3 = selectors.union(comb);

	return polygon(seg3, epsilon);
}

/**
 * @param {Vec2<number>[][]} poly1
 * @param {Vec2<number>[][]} poly2
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function intersect(poly1, poly2, epsilon) {
	const seg1 = segments(poly1);
	const seg2 = segments(poly2);
	const comb = combine(seg1, seg2);
	const seg3 = selectors.intersect(comb);

	return polygon(seg3, epsilon);
}

/**
	 * @param {Vec2<number>[][]} poly1
	 * @param {Vec2<number>[][]} poly2
 * @param {number} [epsilon]
	 * @returns {Vec2<number>[][]}
	 */
export function difference(poly1, poly2, epsilon) {
	const seg1 = segments(poly1);
	const seg2 = segments(poly2);
	const comb = combine(seg1, seg2);
	const seg3 = selectors.difference(comb);

	return polygon(seg3, epsilon);
}

/**
 * @param {Vec2<number>[][]} poly1
 * @param {Vec2<number>[][]} poly2
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function differenceRev(poly1, poly2, epsilon) {
	const seg1 = segments(poly1);
	const seg2 = segments(poly2);
	const comb = combine(seg1, seg2);
	const seg3 = selectors.differenceRev(comb);

	return polygon(seg3, epsilon);
}

/**
 * @param {Vec2<number>[][]} poly1
 * @param {Vec2<number>[][]} poly2
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function xor(poly1, poly2, epsilon) {
	const seg1 = segments(poly1);
	const seg2 = segments(poly2);
	const comb = combine(seg1, seg2);
	const seg3 = selectors.xor(comb);

	return polygon(seg3, epsilon);
}
