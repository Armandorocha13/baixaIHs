import openpyxl
import pandas as pd
import json

excel_path = "Acompanhamento de baixa - MODENS IHS.xlsx"

try:
    xl = pd.ExcelFile(excel_path)
    print("Sheets in Excel:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        df = xl.parse(sheet, nrows=5)
        print(f"\n--- Sheet: {sheet} (First 5 rows) ---")
        print(df.to_string())
        print("Columns:", list(df.columns))
except Exception as e:
    print("Error reading Excel:", e)
