$dbPath = "C:\BusyWin\DATA\COMP0010\db12026.bds"
$password = "ILoveMyINDIA"

# Connection String for MS Access using OLE DB
# Note: Microsoft.Jet.OLEDB.4.0 is 32-bit only. Microsoft.ACE.OLEDB.12.0 can be 32 or 64.
# We will try ACE first, then Jet.
$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"

try {
    $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
    $conn.Open()
    Write-Host "Connected successfully using ACE provider!"
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TOP 5 Code, Name FROM Master1 WHERE MasterType = 2"
    $reader = $cmd.ExecuteReader()
    
    while ($reader.Read()) {
        Write-Host "Code: $($reader['Code']), Name: $($reader['Name'])"
    }
    
    $conn.Close()
} catch {
    Write-Host "ACE failed. Trying JET..."
    $connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"
    try {
        $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
        $conn.Open()
        Write-Host "Connected successfully using JET provider!"
        
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT TOP 5 Code, Name FROM Master1 WHERE MasterType = 2"
        $reader = $cmd.ExecuteReader()
        
        while ($reader.Read()) {
            Write-Host "Code: $($reader['Code']), Name: $($reader['Name'])"
        }
        
        $conn.Close()
    } catch {
        Write-Host "Failed to connect to database."
        Write-Host $_.Exception.Message
    }
}
