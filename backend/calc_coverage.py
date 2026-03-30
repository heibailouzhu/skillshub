#!/usr/bin/env python3
import json
import sys

with open('target/tarpaulin/backend-coverage.json', 'r') as f:
    data = json.load(f)

traces = data.get('traces', {})
total_lines = 0
covered_lines = 0

for file, line_data in traces.items():
    for line_info in line_data:
        stats = line_info.get('stats', {})
        line_count = stats.get('Line', 0)
        total_lines += 1
        if line_count > 0:
            covered_lines += 1

if total_lines > 0:
    coverage = (covered_lines / total_lines) * 100
    print(f"Total Coverage: {coverage:.2f}%")
    print(f"Covered Lines: {covered_lines}")
    print(f"Total Lines: {total_lines}")
else:
    print("No coverage data found")
