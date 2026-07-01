$configFile = "$PSScriptRoot\busy_config.ini"
$apiUrl = "https://simply-useful.vercel.app/api/busy/sync"

# Function to prompt user and create config
function Create-Config {
    Write-Host "========================================="
    Write-Host "      INITIAL SETUP - BUSY SYNC          "
    Write-Host "========================================="
    Write-Host "It looks like this is your first time running the sync tool."
    Write-Host "Please provide your database details below.`n"

    $dbPath = Read-Host "Enter full path to your .bds database (e.g. C:\BusyWin\DATA\COMP0010\db12026.bds)"
    $password = Read-Host "Enter your database password (e.g. ILoveMyINDIA)"
    $tenantDb = Read-Host "Enter your company/tenant ID (e.g. wh_navsari)"

    $configContent = @"
DatabasePath=$dbPath
DatabasePassword=$password
TenantName=$tenantDb
"@
    
    Set-Content -Path $configFile -Value $configContent
    Write-Host "`nConfiguration saved to $configFile!"
    Write-Host "=========================================`n"
}

# Check if config exists, if not, create it
if (-not (Test-Path $configFile)) {
    Create-Config
}

# Read config file
$config = @{}
Get-Content $configFile | ForEach-Object {
    if ($_ -match "^(.*?)=(.*)$") {
        $config[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$dbPath = $config["DatabasePath"]
$password = $config["DatabasePassword"]
$tenantDb = $config["TenantName"]

if ([string]::IsNullOrWhiteSpace($dbPath) -or [string]::IsNullOrWhiteSpace($tenantDb)) {
    Write-Host "Error: Configuration is missing or corrupted. Please delete busy_config.ini and run again."
    exit
}

Write-Host "Starting Busy Accounting Sync..."
Write-Host "Connecting to Database: $dbPath for Tenant: $tenantDb"

$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"
$conn = $null

try {
    $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
    $conn.Open()
    Write-Host "Connected successfully."
} catch {
    Write-Host "ACE provider failed, trying JET provider..."
    $connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$dbPath;Jet OLEDB:Database Password=$password;"
    try {
        $conn = New-Object System.Data.OleDb.OleDbConnection($connString)
        $conn.Open()
        Write-Host "Connected successfully."
    } catch {
        Write-Host "Failed to connect to database. Please check your path and password in busy_config.ini."
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
