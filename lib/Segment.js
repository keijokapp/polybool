/**
 * @import { Vec2 } from './polybool.js'
 */

/**
 * @typedef {{ above: boolean | undefined, below: boolean | undefined }} SegmentBoolFill
 * @typedef {{ readonly p0: Vec2, readonly p1: Vec2 }} Segment
 */

export class SegmentBool {
	/** @type {Segment} */
	data;

	/** @type {SegmentBoolFill} */
	myFill;

	/** @type {SegmentBoolFill | undefined} */
	otherFill;

	/** @readonly @type {boolean} */
	primary;

	/**
	 * @param {Segment} data
	 * @param {SegmentBoolFill} [fill]
	 * @param {boolean} [primary]
	 */
	constructor(data, fill, primary = true) {
		this.data = data;
		this.myFill = {
			above: fill?.above,
			below: fill?.below,
		};
		this.primary = primary;
	}
}
