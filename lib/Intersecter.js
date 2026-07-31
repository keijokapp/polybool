import * as r from './rational.js';
import { SegmentBool } from './Segment.js';
import { pointLabel, segLabel } from '../test.js';

/**
 * @import { Vec2 } from './polybool.js'
 * @import { Rational } from './rational.js'
 * @import { Segment } from './Segment.js'
 */

/**
 * @typedef {{
 *   before: EventBool | undefined
 *   after: EventBool | undefined
 *   insert(node: EventBool): void
 * }} ListBoolTransition
 * @typedef {{
 *   readonly isStart: boolean
 *   p: Vec2
 *   readonly seg: SegmentBool
 *   readonly other: EventBool
 * }} EventBool
 */

/**
 * @param {SegmentBool[]} segments
 * @param {boolean} selfIntersection
 * @returns {SegmentBool[]}
 */
export function sweep(segments, selfIntersection) {
	const events = segments.flatMap(segmentEvents).sort(compareEvents);

	/** @type {SegmentBool[]} */
	const outputSegments = [];

	/** @type {EventBool[]} */
	const status = [];

	while (events.length) {
		printStatusQueue(status);
		printEventQueue(events);

		const ev = events[0];

		if (ev.isStart) {
			const surrounding = findTransition(
				status,
				here => compareSegments(ev.seg.data, here.seg.data) || -1,
			);
			const above = surrounding.before;
			const below = surrounding.after;

			const eve = (
				above != null
					? checkIntersection(events, ev, above)
					: undefined
			)
				?? (
					below != null
						? checkIntersection(events, ev, below)
						: undefined
				);

			if (eve != null) {
				// ev and eve are equal
				// we'll keep eve and throw away ev

				// merge ev.seg's fill information into eve.seg

				if (selfIntersection) {
					const toggle = ev.seg.myFill.below == null
						|| ev.seg.myFill.above !== ev.seg.myFill.below;

					// merge two segments that belong to the same polygon
					// think of this as sandwiching two segments together, where
					// `eve.seg` is the bottom -- this will cause the above fill flag to
					// toggle
					if (toggle) {
						eve.seg.myFill.above = !eve.seg.myFill.above;
					}
				} else {
					// merge two segments that belong to different polygons
					// each segment has distinct knowledge, so no special logic is
					// needed
					// note that this can only happen once per segment in this phase,
					// because we are guaranteed that all self-intersections are gone
					eve.seg.otherFill = ev.seg.myFill;
				}

				removeEvent(events, ev.other);
				removeEvent(events, ev);
			}

			if (events[0] !== ev) {
				// something was inserted before us in the event queue, so loop back
				// around and process it before continuing
				continue;
			}

			//
			// calculate fill flags
			//
			if (selfIntersection) {
				const toggle = ev.seg.myFill.below == null || ev.seg.myFill.above !== ev.seg.myFill.below;

				ev.seg.myFill.below = below != null && below.seg.myFill.above;

				// since now we know if we're filled below us, we can calculate
				// whether we're filled above us by applying toggle to whatever is
				// below us
				ev.seg.myFill.above = toggle
					? !ev.seg.myFill.below
					: ev.seg.myFill.below;
			} else if (ev.seg.otherFill == null) {
				// now we fill in any missing transition information, since we are
				// all-knowing at this point

				// if we don't have other information, then we need to figure out if
				// we're inside the other polygon
				/** @type {boolean | undefined} */
				let inside;

				if (!below) {
					// if nothing is below us, then we're not filled
					inside = false;
				} else {
					// otherwise, something is below us
					// so copy the below segment's other polygon's above
					// eslint-disable-next-line no-lonely-if
					if (ev.seg.primary === below.seg.primary) {
						if (below.seg.otherFill == null) {
							throw new Error(
								'PolyBool: Unexpected state of otherFill (null)',
							);
						}

						inside = below.seg.otherFill.above;
					} else {
						inside = below.seg.myFill.above;
					}
				}

				ev.seg.otherFill = {
					above: inside,
					below: inside,
				};
			}

			// insert the status and remember it for later removal
			surrounding.insert(ev);
		} else {
			// end

			// removing the status will create two new adjacent edges, so we'll need
			// to check for those
			const i = status.indexOf(ev.other);

			if (i === -1) {
				throw new Error(
					'PolyBool: Zero-length segment detected; your epsilon is '
						+ 'probably too small or too large',
				);
			}

			if (i > 0 && i < status.length - 1) {
				const before = status[i - 1];
				const after = status[i + 1];
				checkIntersection(events, before, after);
			}

			// remove the status
			status.splice(i, 1);

			// if we've reached this point, we've calculated everything there is to
			// know, so save the segment for reporting
			if (!ev.seg.primary) {
				// make sure `seg.myFill` actually points to the primary polygon
				// though
				if (!ev.seg.otherFill) {
					throw new Error('PolyBool: Unexpected state of otherFill (null)');
				}

				const s = ev.seg.myFill;
				ev.seg.myFill = ev.seg.otherFill;
				ev.seg.otherFill = s;
			}

			outputSegments.push(ev.seg);
		}

		// remove the event and continue
		events.shift();
	}

	return outputSegments;
}

/**
 * @param {Vec2} a
 * @param {Vec2} b
 * @returns {boolean}
 */
function isEqualVec2(a, b) {
	return r.eq(a[0], b[0]) && r.eq(a[1], b[1]);
}

/**
 * @param {Vec2} a
 * @param {Vec2} b
 * @returns {-1 | 0 | 1}
 */
function compareVec2(a, b) {
	return r.cmp(a[0], b[0]) || r.cmp(a[1], b[1]);
}

/**
 * @param {EventBool[]} events
 * @param {(node: EventBool) => number} check
 * @returns {ListBoolTransition}
 */
function findTransition(events, check) {
	// bisect to find the transition point
	let i = 0;
	let high = events.length;

	while (i < high) {
		// eslint-disable-next-line no-bitwise
		const mid = (i + high) >> 1;

		if (check(events[mid]) < 0) {
			high = mid;
		} else {
			i = mid + 1;
		}
	}

	return {
		before: i > 0 ? events[i - 1] : undefined,
		after: events[i],
		insert: node => { /*  */
			events.splice(i, 0, node);
		},
	};
}

/**
 * @param {EventBool[]} events
 * @param {EventBool} ev
 * @param {Vec2} p
 */
function divideEvent(events, ev, p) {
	console.log(`Dividing ${segLabel(ev.seg.data)} on ${pointLabel(p)}`);

	const newSegmnent = new SegmentBool({ p0: p, p1: ev.seg.data.p1 }, ev.seg.myFill, ev.seg.primary);

	// slides an end backwards
	//   (start)------------(end)    to:
	//   (start)---(end)
	removeEvent(events, ev.other);
	ev.seg.data = { p0: ev.seg.data.p0, p1: p };
	ev.other.p = p;
	addEvent(events, ev.other);
	const [evStart, evEnd] = segmentEvents(newSegmnent);
	addEvent(events, evStart);
	addEvent(events, evEnd);
}

/**
 * @param {EventBool[]} events
 * @param {EventBool} ev
 */
function addEvent(events, ev) {
	findTransition(events, here => compareEvents(ev, here)).insert(ev);
}

/**
 * @param {EventBool[]} events
 * @param {EventBool} event
 */
function removeEvent(events, event) {
	const i = events.indexOf(event);

	if (i >= 0) {
		events.splice(i, 1);
	}
}

/**
 * @param {SegmentBool} seg
 * @returns {[EventBool, EventBool]}
 */
function segmentEvents(seg) {
	/** @type {EventBool} */
	const evStart = {
		isStart: true,
		p: seg.data.p0,
		seg,
		other: /** @type {any} */(undefined),
	};
	/** @type {EventBool} */
	const evEnd = {
		isStart: false,
		p: seg.data.p1,
		seg,
		other: evStart,
	};
	// @ts-expect-error
	evStart.other = evEnd;

	return [evStart, evEnd];
}

/**
 * @param {EventBool[]} events
 * @param {EventBool} ev1
 * @param {EventBool} ev2
 * @returns {EventBool | undefined}
 */
function checkIntersection(events, ev1, ev2) {
	console.log(`Checking intersection between ${segLabel(ev1.seg.data)} and ${segLabel(ev2.seg.data)}`);

	// returns the segment equal to ev1, or undefined if nothing equal
	const seg1 = ev1.seg;
	const seg2 = ev2.seg;

	const a0 = seg1.data.p0;
	const a1 = seg1.data.p1;
	const b0 = seg2.data.p0;
	const b1 = seg2.data.p1;

	const dax = r.minus(a1[0], a0[0]);
	const day = r.minus(a1[1], a0[1]);
	const dbx = r.minus(b1[0], b0[0]);
	const dby = r.minus(b1[1], b0[1]);
	const ba0x = r.minus(b0[0], a0[0]);
	const ba0y = r.minus(b0[1], a0[1]);

	const axb = det(dax, day, dbx, dby);

	if (r.eq0(axb)) {
		if (!r.eq0(det(ba0x, ba0y, dax, day))) {
			return;
		}

		// lines are coincident
		const a1b1 = compareVec2(a0, b0);

		if (a1b1 === 0) {
			const a2b2 = compareVec2(a1, b1);

			if (a2b2 > 0) {
				//  (a0)----------(a1)
				//  (b0)---(b1)
				divideEvent(events, ev1, seg2.data.p1);
			} else if (a2b2 < 0) {
				//  (a0)---(a1)
				//  (b0)----------(b1)
				divideEvent(events, ev2, seg1.data.p1);
			}

			return ev2;
		}

		if (a1b1 > 0 && compareVec2(a0, b1) < 0) {
			const a2b2 = compareVec2(a1, b1);

			if (a2b2 > 0) {
				//         (a0)----------(a1)
				//  (b0)----------(b1)
				divideEvent(events, ev1, b1);
			} else if (a2b2 < 0) {
				//         (a0)---(a1)
				//  (b0)-----------------(b1)
				divideEvent(events, ev2, a1);
			}

			//         (a0)---(a1)
			//  (b0)----------(b1)
			divideEvent(events, ev2, a0);
		}
	} else {
		// otherwise, not coincident, so they intersect somewhere

		const t = r.div(det(ba0x, ba0y, dbx, dby), axb);
		const t0 = r.cmp0(t);

		if (t0 < 0) {
			// intersection lies before the start of the first segment
			return;
		}

		const t1 = r.cmp1(t);

		if (t1 > 0) {
			// intersection lies past the end of the first segment
			return;
		}

		const u = r.div(det(ba0x, ba0y, dax, day), axb);
		const u0 = r.cmp0(u);

		if (u0 < 0) {
			// intersection lies before the start of the second segment
			return;
		}

		const u1 = r.cmp1(u);

		if (u1 > 0) {
			// intersection lies past the end of the second segment
			return;
		}

		// process a single intersection

		/** @type {Vec2} */
		/* eslint-disable no-nested-ternary */
		const p = t0 === 0
			? a0
			: t1 === 0
				? a1
				: u0 === 0
					? b0
					: u1 === 0
						? b1
						: [
							r.simplify(r.plus(a0[0], r.times(dax, t))),
							r.simplify(r.plus(a0[1], r.times(day, t))),
						];
		/* eslint-enable */

		if (t0 > 0 && t1 < 0) {
			divideEvent(events, ev1, p);
		}

		if (u0 > 0 && u1 < 0) {
			divideEvent(events, ev2, p);
		}
	}
}

/**
 * @param {EventBool} eventA
 * @param {EventBool} eventB
 * @returns {number}
 */
function compareEvents(eventA, eventB) {
	const a1 = eventA.p;
	const a2 = eventA.other.p;
	const b1 = eventB.p;
	const b2 = eventB.other.p;

	// compare the selected points first
	const comp = compareVec2(a1, b1);

	if (comp !== 0) {
		return comp;
	}

	// the selected points are the same

	if (isEqualVec2(a2, b2)) {
		// if the non-selected points are the same too...
		return 0; // then the segments are equal
	}

	return +eventA.isStart - +eventB.isStart // favor the one that isn't the start
		|| compareSegments(eventB.seg.data, eventA.seg.data);
}

/**
 * TODO: verify that it works properly: https://github.com/velipso/polybool/issues/9
 * @param {Segment} seg1
 * @param {Segment} seg2
 * @returns {-1 | 0 | 1}
 */
function compareSegments(seg1, seg2) {
	const dx2 = r.minus(seg2.p1[0], seg2.p0[0]);
	const dy2 = r.minus(seg2.p1[1], seg2.p0[1]);

	return r.cmp0(det(r.minus(seg1.p0[0], seg2.p1[0]), r.minus(seg1.p0[1], seg2.p1[1]), dx2, dy2))
	|| r.cmp0(det(r.minus(seg1.p1[0], seg2.p1[0]), r.minus(seg1.p1[1], seg2.p1[1]), dx2, dy2));
}

/**
 * @param {Rational} dx1
 * @param {Rational} dy1
 * @param {Rational} dx2
 * @param {Rational} dy2
 * @returns {Rational}
 */
function det(dx1, dy1, dx2, dy2) {
	return r.minus(r.times(dx1, dy2), r.times(dx2, dy1));
}

/**
 * @param {EventBool[]} events
 */
function printEventQueue(events) {
	console.log('Event queue:');
	events.forEach(ev => {
		console.log(`Event ${pointLabel(ev.p)} for ${segLabel(ev.seg.data)}`);
	});
}

/**
 * @param {EventBool[]} status
 */
function printStatusQueue(status) {
	console.log('Status:');
	status.forEach(ev => {
		console.log(`Event ${pointLabel(ev.p)} for ${segLabel(ev.seg.data)}`);
	});
}
