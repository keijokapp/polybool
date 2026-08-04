// @ts-check

import Zip from '@arbendium/zip/zip';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { pointLabel } from './test.js';

/**
 * @typedef {[number, number]} Point
 * @typedef {Point[]} Ring
 */

/**
 * @param {Ring} ring
 * @returns {Ring}
 */
function openRing(ring) {
	if (ring.length > 1) {
		const [fx, fy] = ring[0];
		const [lx, ly] = ring[ring.length - 1];

		if (fx === lx && fy === ly) {
			return ring.slice(0, -1);
		}
	}

	return ring;
}

/**
 * @param {Iterable<Ring>} rings
 * @returns {string}
 */
function buildXml(rings) {
	/** @type {string[]} */
	const body = [];

	let ringIndex = 0;

	for (const rawRing of rings) {
		const ring = openRing(rawRing);

		if (ring.length < 3) {
			throw new Error(`Ring ${ringIndex} has fewer than 3 distinct points`);
		}

		ringIndex++;

		// Labels avoid underscores, which GeoGebra interprets as subscripts.
		const polygonLabel = `poly${ringIndex}`;
		/** @type {string[]} */
		const pointLabels = [];

		ring.forEach(([x, y]) => {
			const label = pointLabel([x, y]);
			pointLabels.push(label);

			body.push(
				`\t\t<expression label="${label}" exp="${`(${x}, ${y})`}"/>`,
				`\t\t<element type="point" label="${label}"><coords x="${x}" y="${y}" z="1"/></element>`,
			);
		});

		const inputs = pointLabels.map((label, i) => `a${i}="${label}"`).join(' ');

		// A polygon command outputs the polygon itself followed by one segment
		// per edge (one per vertex, since the polygon is closed).
		const outputs = [
			`a0="${polygonLabel}"`,
			...pointLabels.map((_, i) => `a${i + 1}="${`${polygonLabel}s${i + 1}`}"`),
		].join(' ');

		body.push(
			'\t\t<command name="Polygon">',
			`\t\t\t<input ${inputs}/>`,
			`\t\t\t<output ${outputs}/>`,
			'\t\t</command>',
			`\t\t<element type="polygon" label="${polygonLabel}"/>`,
		);
	}

	return `<?xml version="1.0" encoding="utf-8"?>
<geogebra format="5.0" version="5.0.0.0" app="classic">
\t<construction>
${body.join('\n')}
\t</construction>
</geogebra>
`;
}

/**
 * @param {Iterable<Ring>} rings
 * @param {string} file
 */
export async function writeGeogebra(rings, file) {
	const xml = buildXml(rings);

	const zip = new Zip();

	const promise = pipeline(zip, createWriteStream(file));

	// GeoGebra stores the construction uncompressed under this exact name.
	zip.addBuffer(Buffer.from(xml, 'utf8'), 'geogebra.xml');
	zip.addCentralDirectoryRecord();
	zip.end();

	await promise;
}

/**
 * @param {[number, number][][]} rings
 */
export function printGeogebra(rings) {
	let i = 0;

	while (i < rings.length) {
		let ring = rings[i];

		// Remove duplicated last point if present
		if (
			ring.length > 1
				&& ring[0][0] === ring[ring.length - 1][0]
				&& ring[0][1] === ring[ring.length - 1][1]
		) {
			ring = ring.slice(0, -1);
		}

		const points = ring.map(p => [pointLabel(p), `(${p[0]},${p[1]})`]);

		console.log([
			...points.map(([label, p]) => `${label} = ${p}`),
			`Polygon(${points.map(([label]) => label).join(',')})`,
		].join('\n'));

		i++;
	}
}
