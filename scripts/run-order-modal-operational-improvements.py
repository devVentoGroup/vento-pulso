from pathlib import Path


script_path = Path("scripts/apply-order-modal-operational-improvements.py")
source = script_path.read_text(encoding="utf-8")

current_target = 'board_path = Path("src/app/orders/orders-board.tsx")'
legacy_target = 'board_path = Path("src/app/orders/orders-board-legacy.tsx")'

if current_target in source:
    source = source.replace(current_target, legacy_target, 1)
elif legacy_target not in source:
    raise RuntimeError("Missing orders board target in operational improvements script")

compiled = compile(source, str(script_path), "exec")
exec(compiled, {"__name__": "__main__", "__file__": str(script_path)})
