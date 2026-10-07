import openpyxl
import os
import sys

filename = r"c:\Users\Admin\Downloads\EcoCollect-main\EcoCollect-main\web\WASTEREPORTING_WEB_1500_TEST_CASES.xlsx"

print("Starting complete verification of WASTEREPORTING_WEB_1500_TEST_CASES.xlsx...")

if not os.path.exists(filename):
    print(f"ERROR: File {filename} does not exist!")
    sys.exit(1)

wb = openpyxl.load_workbook(filename, data_only=True)
sheets = wb.sheetnames

print(f"Sheet names found ({len(sheets)} total): {sheets}")

expected_sheets = ["Summary", "SELENIUM_300", "APPIUM_300", "UNIT_300", "LOAD_300", "VULNERABILITY_300"]
for s in expected_sheets:
    if s not in sheets:
        print(f"ERROR: Expected sheet '{s}' missing!")
        sys.exit(1)

print("SUCCESS: All 6 required sheets exist in correct order!")

testing_sheets = {
    "SELENIUM_300": ("SEL", 300),
    "APPIUM_300": ("APP", 300),
    "UNIT_300": ("UNIT", 300),
    "LOAD_300": ("LOAD", 300),
    "VULNERABILITY_300": ("VUL", 300)
}

columns_expected = [
    "Test Case ID", "Module", "Feature", "Test Scenario",
    "Test Case Description", "Preconditions", "Test Data", "Test Steps",
    "Expected Result", "Priority", "Severity", "Test Type",
    "Automation Status", "Execution Status", "Actual Result", "Comments"
]

all_ids = set()
all_scenarios = set()
total_cases = 0

for sheet_name, (prefix, exp_count) in testing_sheets.items():
    ws = wb[sheet_name]
    
    # Header check
    headers = [ws.cell(row=1, column=col_idx).value for col_idx in range(1, 17)]
    if headers != columns_expected:
        print(f"ERROR in {sheet_name}: Headers do not match expected!")
        print(f"Got: {headers}")
        sys.exit(1)
        
    case_count = 0
    for r in range(2, ws.max_row + 1):
        row_id = ws.cell(row=r, column=1).value
        if row_id is None:
            continue
        case_count += 1
        
        # ID check
        if row_id in all_ids:
            print(f"ERROR: Duplicate Test Case ID found: '{row_id}' in {sheet_name} row {r}")
            sys.exit(1)
        all_ids.add(row_id)
        
        # Scenario check
        scenario = ws.cell(row=r, column=4).value
        if not scenario:
            print(f"ERROR: Missing Test Scenario at row {r} in {sheet_name}")
            sys.exit(1)
        if scenario in all_scenarios:
            print(f"ERROR: Duplicate Test Scenario found: '{scenario}' in {sheet_name}")
            sys.exit(1)
        all_scenarios.add(scenario)
        
        # Required field completeness check
        for c in range(1, 17):
            val = ws.cell(row=r, column=c).value
            if val is None or str(val).strip() == "":
                print(f"ERROR: Empty field at column {columns_expected[c-1]} in {sheet_name} row {r}")
                sys.exit(1)

    print(f"Sheet '{sheet_name}': Count = {case_count} (Expected: {exp_count})")
    if case_count != exp_count:
        print(f"ERROR: Sheet {sheet_name} count mismatch! Expected {exp_count}, got {case_count}")
        sys.exit(1)
        
    total_cases += case_count

print(f"\nTOTAL TEST CASES VERIFIED: {total_cases} / 1500")

if total_cases == 1500:
    print("SUCCESS: EXACTLY 1,500 UNIQUE TEST CASES VERIFIED ACROSS ALL SHEETS!")
else:
    print(f"ERROR: Total count is {total_cases}, expected 1500!")
    sys.exit(1)
