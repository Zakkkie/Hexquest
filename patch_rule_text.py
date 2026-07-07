import re

with open('rules/growth.ts', 'r') as f:
    content = f.read()

# Fix the error message to say currentLevel instead of targetLevel
old_msg = "reason: `Нет опоры: нужны 2 соседа на уровне L${targetLevel} или 5 более высоких соседей (правило впадины). (UNSTABLE)`,"
new_msg = "reason: `Нет опоры: нужны 2 соседа минимум на уровне L${currentLevel} или 5 более высоких соседей (правило впадины). (UNSTABLE)`,"

if old_msg in content:
    content = content.replace(old_msg, new_msg)
    print("Replaced successfully.")
else:
    print("Could not find the old message.")

with open('rules/growth.ts', 'w') as f:
    f.write(content)
