#!/usr/bin/env python3
import json

with open('target/tarpaulin/backend-coverage.json', 'r') as f:
    data = json.load(f)

traces = data.get('traces', {})

# 统计每个文件的覆盖情况
file_stats = {}

for file_path, line_list in traces.items():
    covered_lines = 0
    total_lines = len(line_list)

    for line_info in line_list:
        stats = line_info.get('stats', {})
        line_count = stats.get('Line', 0)
        if line_count > 0:
            covered_lines += 1

    if total_lines > 0:
        file_stats[file_path] = {
            'covered': covered_lines,
            'total': total_lines,
            'coverage_pct': (covered_lines / total_lines) * 100
        }

# 计算总体覆盖率
total_covered = sum(f['covered'] for f in file_stats.values())
total_lines = sum(f['total'] for f in file_stats.values())

# 按覆盖率排序
sorted_files = sorted(file_stats.items(), key=lambda x: x[1]['coverage_pct'], reverse=True)

print("=== SkillHub Backend 测试覆盖率报告 ===\n")
if total_lines > 0:
    print(f"总体覆盖率: {total_covered}/{total_lines} = {total_covered*100/total_lines:.2f}%\n")
else:
    print("总体覆盖率: 无数据\n")

print(f"文件总数: {len(file_stats)}\n")

print("各文件覆盖率详情:")
print("-" * 120)
print(f"{'文件路径':<70} {'覆盖行数':<10} {'总行数':<10} {'覆盖率':<10}")
print("-" * 120)

for file_path, stats in sorted_files:
    path_display = file_path[-68:] if len(file_path) > 68 else file_path
    print(f"{path_display:<70} {stats['covered']:<10} {stats['total']:<10} {stats['coverage_pct']:.2f}%")

print("-" * 120)
