#!/usr/bin/env python3
from decimal import Decimal

ONE = Decimal('0.001')

base = [Decimal(x) for x in [
    '0.130','0.090','0.078','0.065','0.060','0.055','0.050','0.046','0.042','0.039',
    '0.036','0.034','0.032','0.031','0.030','0.029','0.028','0.027','0.026','0.025','0.024','0.023'
]]
assert sum(base) == Decimal('1.000'), f"Base sum wrong: {sum(base)}"

all_payouts = {22: base}

for pp in range(23, 41):
    prev = list(all_payouts[pp - 1])
    new_bottom = Decimal('0.023') - (pp - 22) * ONE

    remaining = new_bottom
    new_vals = list(prev)

    for i in range(len(new_vals)):
        if remaining <= 0:
            break
        floor_val = new_vals[i + 1] if i + 1 < len(new_vals) else ONE
        max_reduce = new_vals[i] - floor_val
        if max_reduce > 0:
            actual_reduce = min(remaining, max_reduce)
            new_vals[i] -= actual_reduce
            remaining -= actual_reduce

    if remaining > 0:
        raise ValueError(f"pp={pp}: could not free up full amount, remaining={remaining}")

    new_vals.append(new_bottom)
    total = sum(new_vals)
    assert total == Decimal('1.000'), f"pp={pp}: sum={total}"
    all_payouts[pp] = new_vals

# Print verification
for pp in range(23, 41):
    vals = all_payouts[pp]
    s = sum(vals)
    mono = all(vals[i] >= vals[i+1] for i in range(len(vals)-1))
    print(f"pp={pp}: n={len(vals)}, top={vals[0]}, bottom={vals[-1]}, sum={s}, monotone={mono}")

# Generate SQL
print("\n-- SQL --")
rows = []
for pp in range(23, 41):
    for place, payout in enumerate(all_payouts[pp], 1):
        rows.append(f"({pp}, {place}, {payout})")

print("INSERT INTO eventPayOut (placespaid, place, payout) VALUES")
print(",\n".join(rows) + ";")
