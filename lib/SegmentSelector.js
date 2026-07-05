import { SegmentBool } from './Segment.js';

/**
 * @param {SegmentBool[]} segments
 * @param {number[]} selection
 * @returns {SegmentBool[]}
 */
function select(segments, selection) {
	/** @type {SegmentBool[]} */
	const result = [];

	for (const seg of segments) {
		const index = (seg.myFill.above ? 8 : 0)
			+ (seg.myFill.below ? 4 : 0)
			+ (seg.otherFill && seg.otherFill.above ? 2 : 0)
			+ (seg.otherFill && seg.otherFill.below ? 1 : 0);
		const flags = selection[index];
		// eslint-disable-next-line no-bitwise
		const above = (flags & 1) !== 0; // bit 1 if filled above
		// eslint-disable-next-line no-bitwise
		const below = (flags & 2) !== 0; // bit 2 if filled below

		if (above !== below) {
			// copy the segment to the results, while also calculating the fill status
			const fill = { above, below };

			result.push(new SegmentBool(seg.data, fill));
		}
	}

	return result;
}

/**
 * @param {SegmentBool[]} segments
 * @returns {SegmentBool[]}
 */
export function union(segments) {
	// primary | secondary
	// above1 below1 above2 below2    Keep?               Value
	//    0      0      0      0   =>   yes if open         4
	//    0      0      0      1   =>   yes filled below    2
	//    0      0      1      0   =>   yes filled above    1
	//    0      0      1      1   =>   no                  0
	//    0      1      0      0   =>   yes filled below    2
	//    0      1      0      1   =>   yes filled below    2
	//    0      1      1      0   =>   no                  0
	//    0      1      1      1   =>   no                  0
	//    1      0      0      0   =>   yes filled above    1
	//    1      0      0      1   =>   no                  0
	//    1      0      1      0   =>   yes filled above    1
	//    1      0      1      1   =>   no                  0
	//    1      1      0      0   =>   no                  0
	//    1      1      0      1   =>   no                  0
	//    1      1      1      0   =>   no                  0
	//    1      1      1      1   =>   no                  0
	return select(segments, [
		4, 2, 1, 0,
		2, 2, 0, 0,
		1, 0, 1, 0,
		0, 0, 0, 0,
	]);
}

/**
 * @param {SegmentBool[]} segments
 * @returns {SegmentBool[]}
 */
export function intersect(segments) {
	// primary & secondary
	// above1 below1 above2 below2    Keep?               Value
	//    0      0      0      0   =>   no                  0
	//    0      0      0      1   =>   no                  0
	//    0      0      1      0   =>   no                  0
	//    0      0      1      1   =>   yes if open         4
	//    0      1      0      0   =>   no                  0
	//    0      1      0      1   =>   yes filled below    2
	//    0      1      1      0   =>   no                  0
	//    0      1      1      1   =>   yes filled below    2
	//    1      0      0      0   =>   no                  0
	//    1      0      0      1   =>   no                  0
	//    1      0      1      0   =>   yes filled above    1
	//    1      0      1      1   =>   yes filled above    1
	//    1      1      0      0   =>   yes if open         4
	//    1      1      0      1   =>   yes filled below    2
	//    1      1      1      0   =>   yes filled above    1
	//    1      1      1      1   =>   no                  0
	return select(segments, [
		0, 0, 0, 4,
		0, 2, 0, 2,
		0, 0, 1, 1,
		4, 2, 1, 0,
	]);
}

/**
 * @param {SegmentBool[]} segments
 * @returns {SegmentBool[]}
 */
export function difference(segments) {
	// primary - secondary
	// above1 below1 above2 below2    Keep?               Value
	//    0      0      0      0   =>   yes if open         4
	//    0      0      0      1   =>   no                  0
	//    0      0      1      0   =>   no                  0
	//    0      0      1      1   =>   no                  0
	//    0      1      0      0   =>   yes filled below    2
	//    0      1      0      1   =>   no                  0
	//    0      1      1      0   =>   yes filled below    2
	//    0      1      1      1   =>   no                  0
	//    1      0      0      0   =>   yes filled above    1
	//    1      0      0      1   =>   yes filled above    1
	//    1      0      1      0   =>   no                  0
	//    1      0      1      1   =>   no                  0
	//    1      1      0      0   =>   no                  0
	//    1      1      0      1   =>   yes filled above    1
	//    1      1      1      0   =>   yes filled below    2
	//    1      1      1      1   =>   no                  0
	return select(segments, [
		4, 0, 0, 0,
		2, 0, 2, 0,
		1, 1, 0, 0,
		0, 1, 2, 0,
	]);
}

/**
 * @param {SegmentBool[]} segments
 * @returns {SegmentBool[]}
 */
export function differenceRev(segments) {
	// secondary - primary
	// above1 below1 above2 below2    Keep?               Value
	//    0      0      0      0   =>   yes if open         4
	//    0      0      0      1   =>   yes filled below    2
	//    0      0      1      0   =>   yes filled above    1
	//    0      0      1      1   =>   no                  0
	//    0      1      0      0   =>   no                  0
	//    0      1      0      1   =>   no                  0
	//    0      1      1      0   =>   yes filled above    1
	//    0      1      1      1   =>   yes filled above    1
	//    1      0      0      0   =>   no                  0
	//    1      0      0      1   =>   yes filled below    2
	//    1      0      1      0   =>   no                  0
	//    1      0      1      1   =>   yes filled below    2
	//    1      1      0      0   =>   no                  0
	//    1      1      0      1   =>   no                  0
	//    1      1      1      0   =>   no                  0
	//    1      1      1      1   =>   no                  0
	return select(segments, [
		4, 2, 1, 0,
		0, 0, 1, 1,
		0, 2, 0, 2,
		0, 0, 0, 0,
	]);
}

/**
 * @param {SegmentBool[]} segments
 * @returns {SegmentBool[]}
 */
export function xor(segments) {
	// primary ^ secondary
	// above1 below1 above2 below2    Keep?               Value
	//    0      0      0      0   =>   yes if open         4
	//    0      0      0      1   =>   yes filled below    2
	//    0      0      1      0   =>   yes filled above    1
	//    0      0      1      1   =>   no                  0
	//    0      1      0      0   =>   yes filled below    2
	//    0      1      0      1   =>   no                  0
	//    0      1      1      0   =>   no                  0
	//    0      1      1      1   =>   yes filled above    1
	//    1      0      0      0   =>   yes filled above    1
	//    1      0      0      1   =>   no                  0
	//    1      0      1      0   =>   no                  0
	//    1      0      1      1   =>   yes filled below    2
	//    1      1      0      0   =>   no                  0
	//    1      1      0      1   =>   yes filled above    1
	//    1      1      1      0   =>   yes filled below    2
	//    1      1      1      1   =>   no                  0
	return select(segments, [
		4, 2, 1, 0,
		2, 0, 0, 1,
		1, 0, 0, 2,
		0, 1, 2, 0,
	]);
}
