$dbPath = "C:\BusyWin\DATA\COMP0010\db12026.bds"
$password = "ILoveMyINDIA"
$apiUrl = "https://simply-useful.vercel.app/api/busy/sync"
$tenantDb = "wh_navsari"

Write-Host "Starting Busy Accounting Sync (PowerShell Version)..."
Write-Host "Connecting to Database: $dbPath"

$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"
$conn = $null

try {
    $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
    $conn.Open()
    Write-Host "Connected using ACE provider."
} catch {
    Write-Host "ACE provider failed, trying JET provider..."
    $connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"
    try {
        $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
        $conn.Open()
        Write-Host "Connected using JET provider."
    } catch {
        Write-Host "Failed to connect to database."
        Write-Host $_.Exception.Message
        exit
    }
}

try {
    # 1. Fetch Parties
    Write-Host "Fetching Parties..."
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Code, Name, Alias FROM Master1 WHERE MasterType = 2"
    $reader = $cmd.ExecuteReader()
    
    $parties = @()
    while ($reader.Read()) {
        $parties += @{
            code = $reader["Code"]
            name = if ([string]::IsNullOrWhiteSpace($reader["Name"])) { "Unknown" } else { $reader["Name"].ToString() }
            alias = if ([string]::IsNullOrWhiteSpace($reader["Alias"])) { "" } else { $reader["Alias"].ToString() }
        }
    }
    $reader.Close()
    Write-Host "Found $($parties.Length) parties."

    # 2. Fetch Ledger Entries
    Write-Host "Fetching Ledger Entries..."
    $cmd.CommandText = "
        SELECT t.MasterCode1, t.Date, t.VchType, t.VchNo, t.Value1, t.ShortNar 
        FROM Tran2 t
        INNER JOIN Master1 m ON t.MasterCode1 = m.Code
        WHERE t.RecType = 1 AND m.MasterType = 2
    "
    $reader = $cmd.ExecuteReader()
    
    $ledgers = @()
    while ($reader.Read()) {
        $dateObj = $reader["Date"]
        $dateStr = ""
        if ($dateObj -is [System.DateTime]) {
            $dateStr = $dateObj.ToString("yyyy-MM-dd")
        }
        
        if ($dateStr -ne "") {
            $ledgers += @{
                party_code = $reader["MasterCode1"]
                date = $dateStr
                vch_type = $reader["VchType"]
                vch_no = if ([string]::IsNullOrWhiteSpace($reader["VchNo"])) { "" } else { $reader["VchNo"].ToString().Trim() }
                amount = $reader["Value1"]
                short_nar = if ([string]::IsNullOrWhiteSpace($reader["ShortNar"])) { "" } else { $reader["ShortNar"].ToString() }
            }
        }
    }
    $reader.Close()
    Write-Host "Found $($ledgers.Length) ledger entries."

    # 3. Post to API
    Write-Host "Preparing payload..."
    $payload = @{
        tenant_db = $tenantDb
        parties = $parties
        ledgers = $ledgers
    }

    # Convert to JSON with depth to prevent truncation and remove extraneous whitespace
    $jsonPayload = $payload | ConvertTo-Json -Depth 5 -Compress

    Write-Host "Pushing data to Cloud API ($apiUrl)..."
    
    # Using TLS 1.2 for secure connection
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $jsonPayload -ContentType "application/json"
    
    Write-Host "Sync successful!"
    Write-Host "Response: $($response.message)"

} catch {
    Write-Host "An error occurred during sync:"
    Write-Host $_.Exception.Message
} finally {
    if ($conn -ne $null -and $conn.State -eq 'Open') {
        $conn.Close()
    }
}
