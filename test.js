import test, { describe } from 'node:test';
import assert from 'node:assert';
import * as polybool from './lib/polybool.js';
import { writeGeogebra, printGeogebra } from './geogebra.js';

/**
 * @import { Rational } from './lib/rational.js'
 * @import { Segment } from './lib/Segment.js'
 * @import { EventBool } from './lib/Intersecter.js'
 * @import { Vec2 } from './lib/polybool.js'
 */

/** @type {Record<string, string>} */
let pointMap = {};

test('1', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[0, 0], // A
		[1, 1], // B
		[1, 0], // C
	]];

	const labels = 'ABC';
	pointMap = Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'ACB');
});

test('2', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[0, 0], // A
		[0.5, 1], // B
		[1, 0], // C
	]];

	const labels = ['A', 'B', 'C'];
	pointMap = Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'BAC');
});

test('3', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[3, 0], // A
		[0, 1], // B
		[2, 4], // C
		[2, 3], // D
		[1, 2], // E
		[1, 1], // F
		[3, 1], // G
	]];

	const labels = 'ABCDEFG';
	pointMap = Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'FEDCBAG');
});

test('4', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[3, 4], // A
		[0, 3], // B
		[2, 0], // C
		[2, 1], // D
		[1, 2], // E
		[1, 3], // F
		[3, 3], // G
	]];

	const labels = 'ABCDEFG';
	pointMap = Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'BCDEFGA');
});

test('5', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[587953.1269561613, 6480898.918962788],
		[587933.4319805515, 6480886.175155048],
		[587916.0540609013, 6480871.941811329],
		[587908.6063810413, 6480884.685619079],
		[587899.0071492412, 6480901.070514748],
		[587891.8904773812, 6480915.303858468],
		[587895.2005573112, 6480923.0825463105],
		[587895.3660613114, 6480927.385650227],
		[587885.4358215114, 6480940.791473961],
		[587881.1327175912, 6480950.556209769],
		[587891.0629573913, 6480958.334897611],
		[587932.438956571, 6480991.270192958],
		[588000.792107211, 6480949.066673801],
		[587966.5327798914, 6480914.47633848],
		[587970.0083638212, 6480909.842226578],
		[587977.1250356813, 6480900.408498759],
	]];

	const labels = 'ABCDEFGHIJKLMNOP';

	pointMap = Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'LKJIHGFEDCBAPONM');
});

test('6', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [
		[
			[2.0357337203, 6488655.551446969], // A
			[12.41, 6488661.71], // B
			[13, 6488661.71], // C
			[10, 6488655.551446969], // D
		],
		[
			[12.41, 6488661.71], // B
			[1.4611051541, 6488655.210325929], // E
			[1.4611051541, 6488661.71], // F
		],
	];

	const labels = 'ABCDEFG';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const result = polybool.union(poly, poly);

	assertRegions(result, 'FEBADC');

	const normalizedRegion1 = polybool.segments([poly[0]]);
	const normalizedRegion2 = polybool.segments([poly[1]]);
	const combined = polybool.combine(normalizedRegion1, normalizedRegion2);

	assert.deepStrictEqual(normalizedRegion1.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'A -> D   fill=true/false',
		'A -> B   fill=false/true',
		'D -> C   fill=true/false',
		'B -> C   fill=false/true',
	]);
	assert.deepStrictEqual(normalizedRegion2.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'E -> F   fill=false/true',
		'E -> B   fill=true/false',
		'F -> B   fill=false/true',
	]);
	assert.deepStrictEqual(combined.map(seg => `${segLabel(seg.data)}   myFill=${seg.myFill.above}/${seg.myFill.below}  otherFill=${seg.otherFill?.above}/${seg.otherFill?.below}`), [
		'E -> F   myFill=false/false  otherFill=false/true',
		'A -> D   myFill=true/false  otherFill=false/false',
		'A -> B   myFill=false/true  otherFill=false/false',
		'E -> B   myFill=false/false  otherFill=true/false',
		'F -> B   myFill=false/false  otherFill=false/true',
		'D -> C   myFill=true/false  otherFill=false/false',
		'B -> C   myFill=false/true  otherFill=false/false',
	]);

	const normalizedGeometry = polybool.polygon(polybool.selectors.union(combined));

	assertRegions(normalizedGeometry, 'FEBADC');
});

describe('touching polygons', () => {
	test('7', () => {
		/** @type {Vec2<number>[][]} */
		const poly = [
			[
				[2, 4], // A
				[7, 4], // B
				[5, 3], // C
			],
			[
				[0, 0], // D
				[2, 4], // A
				[1, 0], // E
			],
		];

		const labels = 'ABCDE';
		pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

		const result = polybool.union([poly[0]], [poly[1]]);

		assertRegions(result, 'DEA,ACB');
	});

	test('8', () => {
		/** @type {Vec2<number>[][]} */
		const poly = [
			[
				[2, 4], // A
				[7, 4], // B
				[5, 3], // C
			],
			[
				[0, 0], // D
				[2, 4], // A
				[3, 0], // E
			],
		];

		const labels = 'ABCDE';
		pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

		const result = polybool.union([poly[0]], [poly[1]]);

		assertRegions(result, 'ADE,ACB');
	});

	test('9', () => {
		/** @type {Vec2<number>[][]} */
		const poly = [
			[
				[2, 4], // A
				[7, 4], // B
				[5, 3], // C
			],
			[
				[0, 0], // D
				[2, 4], // A
				[6, 0], // E
			],
		];

		const labels = 'ABCDE';
		pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

		const result = polybool.union([poly[0]], [poly[1]]);

		assertRegions(result, 'ADE,ACB');
	});

	test('10', () => {
		/** @type {Vec2<number>[][]} */
		const poly = [
			[
				[2, 4], // A
				[7, 4], // B
				[5, 3], // C
			],
			[
				[0, 0], // D
				[2, 4], // A
				[8, 0], // E
			],
		];

		const labels = 'ABCDE';
		pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

		const result = polybool.union([poly[0]], [poly[1]]);

		assertRegions(result, 'ACBADE');
	});

	test('11', () => {
		/** @type {Vec2<number>[][]} */
		const poly = [
			[
				[2, 4], // A
				[5, 4], // B
				[7, 3], // C
			],
			[
				[6, 0], // D
				[2, 4], // A
				[8, 0], // E
			],
		];

		const labels = 'ABCDE';
		pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

		const result = polybool.union([poly[0]], [poly[1]]);

		assertRegions(result, 'ACBADE');
	});
});

test('12', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[625803.07, 6497216.08], // A
		[625694.68, 6497146.62], // B
		[625744.21, 6497132.16], // C
		[625736.0738600261, 6497134.535299496], // D
		[625778, 6497091.1383181475], // E
	]];

	const labels = 'ABCDE';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const segments = polybool.segments(poly);

	assert.deepStrictEqual(segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
		'D -> C  fill=false/true',
		'B -> C  fill=true/false',
		'D -> E  fill=true/false',
		'E -> A  fill=true/false',
		'B -> A  fill=false/true',
	]);

	const result = polybool.normalize(poly);
	const shape = polybool.union([poly[0]], [poly[0]]);

	assertRegions(result, 'BCDEA');
	assertRegions(shape, 'BCDEA');
});

test('13', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[623027.4021508485, 6556705.085067615], // A
		[623027.4021509635, 6556705.085067808], // B
		[623027.4021507857, 6556705.085069574], // C
	]];

	const labels = 'ABC';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const result = polybool.normalize(poly);
	const simplifiedResult = polybool.normalize(poly, 2 ** -10);

	assertRegions(result, 'CAB');
	assertRegions(simplifiedResult, '');
});

test('14', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[0, 0], // A
		[0, 2], // B
		[6.461105154128745, 5.210325929], // C
		[0.75, 1.82], // D
		[7.03573372028768, 5.551446969], // E
		[8, 0], // F
	]];

	const labels = 'ABCDEF';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const segments = polybool.segments(poly);

	assert.deepStrictEqual(segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
		'A -> B  fill=false/true',
		'D -> [6.46110515029315, 5.2103259270942095]  fill=true/false',
		'B -> [6.46110515029315, 5.2103259270942095]  fill=false/true',
		'D -> C  fill=false/true',
		'[6.46110515029315, 5.2103259270942095] -> C  fill=true/false',
		'[6.46110515029315, 5.2103259270942095] -> E  fill=false/true',
		'A -> F  fill=true/false',
		'E -> F  fill=false/true',
	]);

	const result = polybool.normalize(poly);

	assertRegions(result, 'E[6.46110515029315, 5.2103259270942095]CD[6.46110515029315, 5.2103259270942095]BAF');
});

test('15', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[652307.36, 6500592.72], // A
		[652311.94, 6500561.67], // B
		[652340, 6500540], // C
		[652309.9703942318, 6500575.022895], // D
	]];

	const labels = 'ABCD';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const result = polybool.normalize(poly);

	assertRegions(result, 'DABC');
});

test('16', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [
		[
			[1, 4], // A
			[2, 4], // B
			[3, 3], // C
			[2, 3], // D
		],
		[
			[0, 4], // E
			[4, 0], // F
			[1, 4], // A
		],
	];

	const labels = 'ABCDEF';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const segments = polybool.segments(poly);

	assert.deepStrictEqual(segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
		'E -> A  fill=false/true',
		'A -> D  fill=true/false',
		'A -> B  fill=false/true',
		'D -> C  fill=true/false',
		'B -> C  fill=false/true',
		'E -> F  fill=true/false',
		'A -> F  fill=false/true',
	]);

	const result = polybool.normalize(poly);

	assertRegions(result, 'ADCBEF');
});

test('19', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [[
		[591147.8506046718, 6482374.0560854785], // A
		[591200.6463796443, 6482373.063060548], // B
		[591214.8958173788, 6482371.659311935], // C
		[591200.6463796222, 6482373.063061498], // D
	]];

	const labels = 'ABCD';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	const segments = polybool.segments(poly);

	assert.deepStrictEqual(segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
		'A -> D  fill=false/true',
		'A -> B  fill=true/false',
		'B -> C  fill=true/false',
		'D -> C  fill=false/true',
	]);

	const result = polybool.normalize(poly);

	assertRegions(result, 'DABC');
});

test.skip('20', () => {
	/** @type {Vec2<number>[][]} */
	const poly = [
		[
			[631440.460619963, 6536883.624922374], // A
			[631447.0807798333, 6536878.494298475], // B
			[631454.362955693, 6536877.004762504], // C
			[631465.782731463, 6536873.860186566], // D
		],
		[
			[631455, 6536870], // E
			[631454.3629556932, 6536877.004762504], // F
			[631447.0807798329, 6536878.494298475], // G
			[631447.0805192329, 6536878.497957625], // H
		],
	];

	const labels = 'ABCDEFGH';
	pointMap = Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]]));

	printGeogebra(poly);
	writeGeogebra(poly, 'shit');

	const segments1 = polybool.segments([poly[0]]);
	assertSegments(segments1, [
		'A -> B  fill=true/false',
		'B -> C  fill=true/false',
		'C -> D  fill=true/false',
		'A -> D  fill=false/true',
	]);

	const segments2 = polybool.segments([poly[1]]);
	assertSegments(segments2, [
		'H -> G  fill=true/false',
		'G -> [631447.084671045, 6536878.493502545]  fill=true/false',
		'H -> [631447.084671045, 6536878.493502545]  fill=false/true',
		'[631447.084671045, 6536878.493502545] -> F  fill=false/true',
		'[631447.084671045, 6536878.493502545] -> E  fill=true/false',
		'F -> E  fill=false/true',
	]);

	const combined = polybool.combine(segments1, segments2);
	assertCombinedSegments(combined, [
		'A -> G  fill=true/false otherFill=false/false',
		'H -> G  fill=true/true otherFill=true/false',
		'G -> G  fill=false/false otherFill=true/false',
		'G -> B  fill=true/false otherFill=true/true',
		'B -> [631447.0846710448, 6536878.493502545]  fill=true/false otherFill=true/true',
		'H -> [631447.0846710448, 6536878.493502545]  fill=true/true otherFill=false/true',
		'G -> [631447.084671045, 6536878.493502545]  fill=false/false otherFill=true/false',
		'[631447.0846710448, 6536878.493502545] -> [631447.084671045, 6536878.493502545]  fill=false/false otherFill=false/true',
		'[631447.084671045, 6536878.493502545] -> [631452.5424117281, 6536877.377146497]  fill=false/false otherFill=false/true',
		'[631447.0846710448, 6536878.493502545] -> [631452.5424117281, 6536877.377146497]  fill=true/false otherFill=false/false',
		'[631452.5424117281, 6536877.377146497] -> C  fill=true/false otherFill=true/true',
		'[631452.5424117281, 6536877.377146497] -> F  fill=true/true otherFill=false/true',
		'C -> F  fill=true/false otherFill=true/true',
		'F -> F  fill=true/true otherFill=false/true',
		'[631447.084671045, 6536878.493502545] -> E  fill=false/false otherFill=true/false',
		'F -> E  fill=false/false otherFill=false/true',
		'F -> D  fill=true/false otherFill=false/false',
		'A -> D  fill=false/true otherFill=false/false',
	]);

	const selected = polybool.selectors.intersect(combined);

	// assert.deepStrictEqual(selected.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
	// 	'[631447.0769740929, 6536878.497247924] -> H  fill=false/true',
	// 	'[631447.0769740929, 6536878.497247924] -> G  fill=true/false',
	// 	'H -> G  fill=false/true',
	// 	'[631452.5424117281, 6536877.377146497] -> C  fill=true/false',
	// 	'[631452.5424117281, 6536877.377146497] -> F  fill=false/true',
	// 	'C -> F  fill=true/false',
	// 	'F -> F  fill=false/true',
	// ]);

	const result = polybool.intersect([poly[0]], [poly[1]]);

	assertRegions(result, '');
});

/**
 * @param {Vec2<number>[][]} regions
 * @param {string} polygon
 */
function assertRegions(regions, polygon) {
	assert.strictEqual(regions.map(region => region.map(pointLabel).join('')).join(','), polygon);
}

/**
 * @param {polybool.SegmentBool[]} segments
 * @param {string[]} expected
 */
function assertSegments(segments, expected) {
	assert.deepStrictEqual(segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), expected);
}

/**
 * @param {polybool.SegmentBool[]} segments
 * @param {string[]} expected
 */
function assertCombinedSegments(segments, expected) {
	assert.deepStrictEqual(segments.map(({ data, myFill, otherFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below} otherFill=${otherFill.above}/${otherFill.below}`), expected);
}

/**
 * @param {Vec2<number | Rational>} p
 * @returns {string}
 */
export function pointLabel(p) {
	return rawPointLabel(p) ?? `[${p[0]}, ${p[1]}]`;
}

/**
 * @param {Vec2<number | Rational>} p
 * @returns {string | undefined}
 */
export function rawPointLabel(p) {
	return pointMap[`${p[0]}:${p[1]}`];
}

/**
 * @param {Segment} seg
 * @returns {string}
 */
export function segLabel(seg) {
	return `${pointLabel(seg.p0)} -> ${pointLabel(seg.p1)}`;
}

/**
 * @param {EventBool} event
 */
export function eventLabel(event) {
	return `${pointLabel(event.p)} for ${segLabel(event.seg.data)}`;
}
