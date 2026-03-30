#!/usr/bin/env python3
import json

with open('target/tarpaulin/backend-coverage.json', 'r') as f:
    data = json.load(f)

files = data.get('files', [])

total_covered = 0
total_coverable = 0

file_coverage = []

for file_data in files:
    covered = file_data.get('covered', 0)
    coverable = file_data.get('coverable', 0)
    path = file_data.get('path', [])

    if coverable > 0:
        coverage_pct = (covered / coverable) * 100
        file_coverage.append({
            'path': '/'.join(path) if path else 'unknown',
            'covered': covered,
            'coverable': coverable,
            'coverage_pct': coverage_pct
        })
        total_covered += covered
        total_coverable += coverable

# 按覆盖率排序
file_coverage.sort(key=lambda x: x['coverage_pct'], reverse=True)

print("=== SkillHub Backend 测试覆盖率报告 ===\n")
print(f"总体覆盖率: {total_covered}/{total_coverable} = {total_covered*100/total_coverable:.2f}%\n")

print("各文件覆盖率详情:")
print("-" * 100)
print(f"{'文件路径':<60} {'覆盖行数':<10} {'总行数':<10} {'覆盖率':<10}")
print("-" * 100)

for file in file_coverage:
    path_display = file['path'][-50:] if len(file['path']) > 50 else file['path']
    print(f"{path_display:<60} {file['covered']:<10} {file['coverable']:<10} {file['coverage_pct']:.2f}%")

print("-" * 100)
