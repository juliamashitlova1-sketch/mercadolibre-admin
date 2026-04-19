
$excelPath = "c:\Users\Administrator\Desktop\美客多软件\procurement_analysis.xlsx"
$Excel = New-Object -ComObject Excel.Application
$Excel.Visible = $false
$Workbook = $Excel.Workbooks.Open($excelPath)
$Worksheet = $Workbook.Sheets.Item(1)

$rows = 10
$cols = 20

$data = @()
for ($r = 1; $r -le $rows; $r++) {
    $rowValues = @()
    for ($c = 1; $c -le $cols; $c++) {
        $val = $Worksheet.Cells.Item($r, $c).Value2
        if ($val -eq $null) { $val = "" }
        $rowValues += $val
    }
    $data += $rowValues -join ","
}

$Workbook.Close($false)
$Excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null

$data | Out-File -FilePath "c:\Users\Administrator\Desktop\美客多软件\excel_structure.csv" -Encoding UTF8
