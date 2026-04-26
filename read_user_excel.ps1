
$excelPath = "C:\Users\Administrator\Desktop\20260424_Orders_US_Mercado_Libre_2026-04-24_23-04hs_3110103283.xlsx"
$Excel = New-Object -ComObject Excel.Application
$Excel.Visible = $false
try {
    $Workbook = $Excel.Workbooks.Open($excelPath)
    $Worksheet = $Workbook.Sheets.Item(1)

    $rows = 15
    $cols = 40

    $data = @()
    for ($r = 1; $r -le $rows; $r++) {
        $rowValues = @()
        for ($c = 1; $c -le $cols; $c++) {
            $val = $Worksheet.Cells.Item($r, $c).Value2
            if ($val -eq $null) { $val = "" }
            $rowValues += [string]$val
        }
        $data += $rowValues -join ","
    }

    $Workbook.Close($false)
    $data | Out-File -FilePath "c:\Users\Administrator\Desktop\美客多软件\user_excel_structure.csv" -Encoding UTF8
} finally {
    $Excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null
}
