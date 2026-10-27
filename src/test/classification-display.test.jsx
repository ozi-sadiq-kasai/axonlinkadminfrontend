import { describe, it, expect } from 'vitest';
import { classificationDisplayLabel } from '../utils/classificationDisplay';
import fs from 'node:fs';
describe('Medical Officer presentation',()=>{
 it('uses the existing GENERALIST value without changing filters or records',()=>{
  const row={clinicalClassification:'GENERALIST',specialty:'Generalist'};
  expect(classificationDisplayLabel(row.clinicalClassification)).toBe('Medical Officer');
  expect(classificationDisplayLabel(row.specialty)).toBe('Medical Officer');
  expect(row.clinicalClassification).toBe('GENERALIST');
  expect(classificationDisplayLabel('SPECIALIST')).toBe('Specialist');
  expect(classificationDisplayLabel('Psychiatry')).toBe('Psychiatry');
 });
 it('facility tabs and staff labels map text while retaining their internal filter values',()=>{
  const source=fs.readFileSync('src/Facilities/Facilities.jsx','utf8');
  expect(source).toContain('"Medical Officers"');expect(source).not.toContain('Generalist Clinicians');
  expect(source).toContain('setStaffTab(t)');expect(source).toContain('classificationDisplayLabel(t)');expect(source).toContain('classFor(s) === "GENERALIST"');
 });
});
