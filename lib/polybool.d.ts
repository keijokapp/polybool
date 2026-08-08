export class Rational {
	readonly n: bigint
	readonly d: bigint
	readonly f: float
	constructor(n: bigint, d: bigint, f: number)
	valueOf(): number
}
export type Vec2<T extends number | Rational = Rational> = [T, T]
export function segments(poly: Vec2<number>[][]): SegmentBool[]
export function combine(segments1: SegmentBool[], segments2: SegmentBool[]): SegmentBool[]
export function polygon(segments: SegmentBool[], epsilon?: number): Vec2<number>[][]
export function normalize(regions: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export function union(poly1: Vec2<number>[][], poly2: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export function intersect(poly1: Vec2<number>[][], poly2: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export function difference(poly1: Vec2<number>[][], poly2: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export function differenceRev(poly1: Vec2<number>[][], poly2: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export function xor(poly1: Vec2<number>[][], poly2: Vec2<number>[][], epsilon?: number): Vec2<number>[][]
export class SegmentBool {
	constructor(data: Segment, fill?: SegmentBoolFill, primary?: boolean)
	data: Segment
	myFill: SegmentBoolFill
	otherFill: SegmentBoolFill | undefined
	readonly primary: boolean
}
export type SegmentBoolFill = {
	above: boolean | undefined
	below: boolean | undefined
}
export type Segment = {
	readonly p0: Vec2
	readonly p1: Vec2
}
export function sweep(segments: SegmentBool[], selfIntersection: boolean): SegmentBool[]
export namespace selectors {
	function union(segments: SegmentBool[]): SegmentBool[]
	function intersect(segments: SegmentBool[]): SegmentBool[]
	function difference(segments: SegmentBool[]): SegmentBool[]
	function differenceRev(segments: SegmentBool[]): SegmentBool[]
	function xor(segments: SegmentBool[]): SegmentBool[]
}
