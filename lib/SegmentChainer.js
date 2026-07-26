//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

import * as r from './rational.js';
import {
	GeometryEpsilon, SegmentBoolLine, SegmentLine, SegmentChainer as UpstreamSegmentChainer,
} from '../upstream/main/src/polybool.ts'; // eslint-disable-line import/no-relative-packages

/**
 * @import { SegmentBool } from './Segment.js'
 * @import { Vec2 } from './util.js'
 */

/**
 * @param {SegmentBool[]} segments
 * @param {number} [epsilon]
 * @returns {Vec2<number>[][]}
 */
export function SegmentChainer(segments, epsilon = 0) {
	const geo = new GeometryEpsilon(epsilon + Number.EPSILON);

	const upstreamSegments = segments.map(segment => new SegmentBoolLine(
		new SegmentLine(vecToFloat(segment.data.p0), vecToFloat(segment.data.p1), geo),
		{
			above: segment.myFill.above ?? false,
			below: segment.myFill.below ?? false,
		},
		true,
		null,
	));

	const result = UpstreamSegmentChainer(upstreamSegments, geo, null);

	const rings = result.map(segments => segments.map(segment => segment.p0));

	return rings;
}

/**
 * @param {Vec2} p
 * @returns {Vec2<number>}
 */
function vecToFloat(p) {
	return [r.toNumber(p[0]), r.toNumber(p[1])];
}
