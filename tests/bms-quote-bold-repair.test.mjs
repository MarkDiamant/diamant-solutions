import test from "node:test";import assert from "node:assert/strict";
import {normaliseQuoteScope as n,repairCrossLineBold as r} from "../business-software-core/lib/quote-format.ts";
// Shapes taken from the stored MJ053 scope_text.
const stored="**1. Main Covered Walkway Structure\n**\nSupply and installation.\n\nSection price:** £21,500**\n\n**2. External Staircase Canopy\n**\nBody.\n\nThe completed canopy will provide weather protection.**\n**\nSection price: **£5,000**\n\n\n**3. External Staircase Handrailing\n\n**Supply, fabrication and installation.\n\nSection price:** £2,500**\n\n**Total Quotation: £29,000**\n";
test("no line has an unbalanced ** after repair",()=>{for(const line of n(stored).split("\n"))assert.equal((line.match(/\*\*/g)||[]).length%2,0,line);});
test("headings become whole-line bold, text and prices unchanged",()=>{const o=n(stored);assert.match(o,/^\*\*1\. Main Covered Walkway Structure\*\*\nSupply/);assert.match(o,/\*\*2\. External Staircase Canopy\*\*\nBody/);assert.match(o,/\*\*3\. External Staircase Handrailing\*\*\n\nSupply, fabrication/);assert.match(o,/weather protection\.\nSection price: \*\*£5,000\*\*/);
 const prices=s=>[...s.matchAll(/£[\d,]+/g)].map(m=>m[0]);assert.deepEqual(prices(o),prices(stored));assert.equal(o.replace(/\*\*/g,"").replace(/\s+/g,""),stored.replace(/\*\*/g,"").replace(/\s+/g,""));});
test("already correct text is untouched and repair is idempotent",()=>{const ok="**1. Title**\nBody\n\nSection price: **£5,000**";assert.equal(r(ok),ok);assert.equal(r(r(stored)),r(stored));});
test("print renderer pattern (per-line **x**) consumes every marker after repair",()=>{for(const line of n(stored).split("\n")){const left=line.replace(/\*\*[^*\n]+\*\*/g,"");assert.ok(!left.includes("**"),line);}});
