// ============================================
// YACC 2025 - BACKEND CODE (Code.gs)
// This file contains ONLY JavaScript code
// ============================================

const CONFIG = {
  SPREADSHEET_ID: '1HJSWc_0CcrryG6D6Lo7Yai4kJeag24Nr2ZRxT0iMH0Y',
  DEVELOPER_EMAIL: 'yacc2025connect@gmail.com',
  ADMIN_EMAIL: 'yacc2025connect@gmail.com',
  EVENT_CONTACT: 'yacc2025connect@gmail.com',
  MAX_SLOTS: 7
};

// MAIN FUNCTION TO SERVE WEB APP
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('YACC 2025 Battle of the Bands Registration')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://i.ibb.co/3m5w9nBF/yacc-logo-removebg-preview.png');
}

// HANDLE REGISTRATION SUBMISSION
function submitRegistration(formData) {
  const transactionId = 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  
  try {
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Get or create Registrations sheet
    let regSheet = spreadsheet.getSheetByName('Registrations');
    if (!regSheet) {
      regSheet = spreadsheet.insertSheet('Registrations');
      setupRegistrationsSheet(regSheet);
    }
    
    // Get or create Waitlist sheet
    let waitlistSheet = spreadsheet.getSheetByName('Waitlist');
    if (!waitlistSheet) {
      waitlistSheet = spreadsheet.insertSheet('Waitlist');
      setupWaitlistSheet(waitlistSheet);
    }
    
    // Check current registration count
    const lastRow = regSheet.getLastRow(); // Returns 1 if only header exists
    const currentSlot = Math.max(1, lastRow); // Ensure at least 1
    
    // Calculate actual filled slots (excluding header)
    const filledSlots = Math.max(0, lastRow - 1);
    
    // Check if slots are full
    if (filledSlots >= CONFIG.MAX_SLOTS) {
      return handleWaitlist(formData, transactionId, waitlistSheet);
    }
    
    // Generate registration number (actual slot number)
    const actualSlot = filledSlots + 1;
    const regNumber = 'YACC-' + actualSlot.toString().padStart(3, '0');
    
    // Create registration object
    const registration = {
      timestamp: new Date(),
      registrationNumber: regNumber,
      churchName: formData.churchName || '',
      churchAddress: formData.churchAddress || '',
      pastorName: formData.pastorName || '',
      churchEmail: formData.churchEmail || '',
      churchPhone: formData.churchPhone || '',
      bandName: formData.bandName || '',
      memberCount: parseInt(formData.memberCount) || 0,
      bandLeader: formData.leaderName || '',
      leaderEmail: formData.leaderEmail || '',
      leaderPhone: formData.leaderPhone || '',
      primaryHymn: formData.primaryHymn === 'other' ? formData.otherHymn : formData.primaryHymn,
      secondaryHymn: formData.secondaryHymn || '',
      arrangement: formData.arrangement || '',
      performanceTime: formData.performanceTime || '',
      signature: formData.signature || '',
      status: 'confirmed',
      performanceOrder: actualSlot
    };
    
    // Prepare row data
    const rowData = [
      registration.timestamp,
      registration.registrationNumber,
      registration.churchName,
      registration.churchAddress,
      registration.pastorName,
      registration.churchEmail,
      registration.churchPhone,
      registration.bandName,
      registration.memberCount,
      registration.bandLeader,
      registration.leaderEmail,
      registration.leaderPhone,
      registration.primaryHymn,
      registration.secondaryHymn,
      registration.arrangement,
      registration.performanceTime,
      JSON.stringify({
        extraMics: formData.extraMics === 'true',
        extraMicCount: parseInt(formData.extraMicCount || 0),
        keyboard: formData.keyboard === 'true',
        amp: formData.amp === 'true',
        percussion: formData.percussion === 'true',
        otherEquipment: formData.otherEquipment === 'true',
        otherEquipmentText: formData.otherEquipmentText || '',
        specialSetup: formData.specialSetup || ''
      }),
      JSON.stringify(getMembersData(formData, registration.memberCount)),
      registration.signature,
      registration.status,
      registration.performanceOrder
    ];
    
    // Save to spreadsheet
    regSheet.appendRow(rowData);
    
    // Format timestamp
    const lastRowAdded = regSheet.getLastRow();
    if (lastRowAdded > 0) {
      regSheet.getRange(lastRowAdded, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    
    // Send emails
    sendConfirmationEmail(registration);
    sendDeveloperNotification('New Registration', registration);
    
    return {
      success: true,
      transactionId: transactionId,
      registrationNumber: regNumber,
      performanceOrder: actualSlot,
      slotUsed: actualSlot,
      totalSlots: CONFIG.MAX_SLOTS,
      message: `Registration successful! Your band "${registration.bandName}" is registered as #${actualSlot}.`,
      timestamp: new Date().toISOString(),
      details: {
        bandName: registration.bandName,
        leaderEmail: registration.leaderEmail,
        churchName: registration.churchName
      }
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Send error notification
    MailApp.sendEmail({
      to: CONFIG.DEVELOPER_EMAIL,
      subject: 'YACC Registration Error',
      body: `Error: ${error.message}\nTransaction: ${transactionId}\nTime: ${new Date()}\nBand: ${formData.bandName || 'Unknown'}`
    });
    
    return {
      success: false,
      transactionId: transactionId,
      message: 'System error. Please try again or contact support.',
      error: error.message
    };
  }
}

// HANDLE WAITLIST REGISTRATION
function handleWaitlist(formData, transactionId, waitlistSheet) {
  try {
    const waitlistData = [
      new Date(),
      formData.churchName || '',
      formData.bandName || '',
      formData.leaderName || '',
      formData.leaderEmail || '',
      formData.leaderPhone || '',
      formData.primaryHymn === 'other' ? formData.otherHymn : formData.primaryHymn,
      formData.performanceTime || '',
      'pending'
    ];
    
    waitlistSheet.appendRow(waitlistData);
    
    // Format timestamp
    const lastRow = waitlistSheet.getLastRow();
    if (lastRow > 0) {
      waitlistSheet.getRange(lastRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    
    // Send notification
    MailApp.sendEmail({
      to: CONFIG.DEVELOPER_EMAIL,
      subject: 'New Waitlist Registration',
      body: `New waitlist entry:\nBand: ${formData.bandName}\nEmail: ${formData.leaderEmail}\nChurch: ${formData.churchName}\nTime: ${new Date()}`
    });
    
    return {
      success: false,
      isWaitlist: true,
      transactionId: transactionId,
      message: 'All 7 registration slots are filled. Your registration has been added to the waiting list.',
      waitlistPosition: waitlistSheet.getLastRow() - 1 // Exclude header
    };
  } catch (error) {
    return {
      success: false,
      message: 'Waitlist error: ' + error.message
    };
  }
}

// EXTRACT MEMBERS DATA FROM FORM
function getMembersData(formData, count) {
  const members = [];
  for (let i = 1; i <= count; i++) {
    const memberName = formData[`memberName${i}`] || '';
    const memberRole = formData[`memberRole${i}`] || '';
    
    if (memberName.trim()) {
      members.push({
        name: memberName.trim(),
        role: memberRole
      });
    }
  }
  return members;
}

// SETUP REGISTRATIONS SHEET
function setupRegistrationsSheet(sheet) {
  const headers = [
    'Timestamp', 'Registration Number', 'Church Name', 'Church Address', 'Pastor Name',
    'Church Email', 'Church Phone', 'Band Name', 'Member Count', 'Band Leader',
    'Leader Email', 'Leader Phone', 'Primary Hymn', 'Secondary Hymn', 'Arrangement Description',
    'Performance Time', 'Equipment Details', 'Members List', 'Digital Signature',
    'Status', 'Performance Order'
  ];
  
  // Clear and set headers
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a2a6c')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Set column widths
  sheet.setColumnWidths(1, 1, 180); // Timestamp
  sheet.setColumnWidths(2, 1, 150); // Registration Number
  sheet.setColumnWidths(3, 1, 200); // Church Name
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  console.log('Registrations sheet setup complete');
}

// SETUP WAITLIST SHEET
function setupWaitlistSheet(sheet) {
  const headers = [
    'Timestamp', 'Church Name', 'Band Name', 'Band Leader', 'Leader Email',
    'Leader Phone', 'Selected Hymn', 'Performance Time', 'Status'
  ];
  
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#FF9800')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  console.log('Waitlist sheet setup complete');
}

// SEND CONFIRMATION EMAIL TO USER
function sendConfirmationEmail(registration) {
  try {
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1a2a6c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1a2a6c; }
        .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .highlight { color: #1a2a6c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>YACC 2025 Battle of the Bands</h2>
        <h3>Registration Confirmation</h3>
    </div>
    
    <div class="content">
        <p>Dear ${registration.pastorName} and ${registration.bandName},</p>
        
        <p>Congratulations! Your registration for the YACC 2025 Battle of the Bands has been successfully received and confirmed.</p>
        
        <div class="details">
            <h4>Registration Details:</h4>
            <p><strong>Registration Number:</strong> <span class="highlight">${registration.registrationNumber}</span></p>
            <p><strong>Church:</strong> ${registration.churchName}</p>
            <p><strong>Band Name:</strong> ${registration.bandName}</p>
            <p><strong>Performance Order:</strong> #${registration.performanceOrder}</p>
            <p><strong>Primary Hymn:</strong> ${registration.primaryHymn}</p>
            <p><strong>Performance Time:</strong> ${registration.performanceTime}</p>
            <p><strong>Slot Status:</strong> ${registration.performanceOrder} of 7 slots</p>
        </div>
        
        <h4>Important Reminders:</h4>
        <ul>
            <li><strong>Repertoire:</strong> Traditional hymns ONLY - NO Contemporary Christian Music (CCM)</li>
            <li><strong>Time Limits:</strong> Setup: 2 minutes maximum, Performance: 5 minutes maximum</li>
            <li><strong>Violation of rules will result in disqualification</strong></li>
        </ul>
        
        <p>If you have any questions, please contact us at <a href="mailto:${CONFIG.EVENT_CONTACT}">${CONFIG.EVENT_CONTACT}</a>.</p>
        
        <p>Blessings,<br>
        <strong>The YACC 2025 Events Committee</strong></p>
    </div>
    
    <div class="footer">
        <p>Youth Alive Christian Church<br>
        This is an automated email. Please do not reply to this address.</p>
    </div>
</body>
</html>`;
    
    MailApp.sendEmail({
      to: registration.leaderEmail,
      cc: registration.churchEmail,
      bcc: CONFIG.ADMIN_EMAIL,
      subject: `YACC 2025 Registration Confirmation: ${registration.registrationNumber}`,
      htmlBody: htmlBody
    });
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

// SEND NOTIFICATION TO DEVELOPER
function sendDeveloperNotification(type, data) {
  try {
    const body = `
${type} Notification
===================
Band: ${data.bandName}
Church: ${data.churchName}
Registration #: ${data.registrationNumber}
Slot: ${data.performanceOrder}/${CONFIG.MAX_SLOTS}
Leader: ${data.bandLeader}
Email: ${data.leaderEmail}
Time: ${new Date().toLocaleString()}
===================
View Sheet: https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit
    `;
    
    MailApp.sendEmail({
      to: CONFIG.DEVELOPER_EMAIL,
      subject: `[YACC 2025] ${type}: ${data.bandName}`,
      body: body
    });
    
    return true;
  } catch (error) {
    console.error('Developer notification failed:', error);
    return false;
  }
}

// GET REGISTRATION COUNT (For frontend display)
function getRegistrationCount() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Registrations');
    if (!sheet) return 0;
    
    const lastRow = sheet.getLastRow();
    return Math.max(0, lastRow - 1); // Subtract header row
  } catch (error) {
    console.error('Error getting registration count:', error);
    return 0;
  }
}

// GET WAITLIST COUNT
function getWaitlistCount() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Waitlist');
    if (!sheet) return 0;
    
    const lastRow = sheet.getLastRow();
    return Math.max(0, lastRow - 1);
  } catch (error) {
    return 0;
  }
}

// GET PUBLIC DATA FOR FRONTEND DISPLAY
function getPublicData() {
  try {
    const registrationsCount = getRegistrationCount();
    const waitlistCount = getWaitlistCount();
    
    return {
      totalRegistrations: registrationsCount,
      waitlistCount: waitlistCount,
      maxSlots: CONFIG.MAX_SLOTS,
      slotsAvailable: Math.max(0, CONFIG.MAX_SLOTS - registrationsCount),
      registrationStatus: registrationsCount >= CONFIG.MAX_SLOTS ? 'waitlist' : 'open',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    return {
      totalRegistrations: 0,
      maxSlots: CONFIG.MAX_SLOTS,
      registrationStatus: 'error',
      error: error.message
    };
  }
}

// TEST CONNECTION TO SPREADSHEET
function testConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetNames = spreadsheet.getSheets().map(sheet => sheet.getName());
    
    return {
      success: true,
      spreadsheetName: spreadsheet.getName(),
      sheets: sheetNames,
      url: `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Cannot access spreadsheet. Please check permissions.'
    };
  }
}

// INITIALIZE DATABASE (Run this once to set up sheets)
function initializeDatabase() {
  try {
    const result = testConnection();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Setup Registrations sheet
    let regSheet = spreadsheet.getSheetByName('Registrations');
    if (!regSheet) {
      regSheet = spreadsheet.insertSheet('Registrations');
      setupRegistrationsSheet(regSheet);
    }
    
    // Setup Waitlist sheet
    let waitlistSheet = spreadsheet.getSheetByName('Waitlist');
    if (!waitlistSheet) {
      waitlistSheet = spreadsheet.insertSheet('Waitlist');
      setupWaitlistSheet(waitlistSheet);
    }
    
    return {
      success: true,
      message: 'Database initialized successfully',
      sheets: ['Registrations', 'Waitlist'],
      url: result.url
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database initialization failed: ' + error.message
    };
  }
}

// TEST FUNCTION - Run this to verify everything works
function testSystem() {
  const tests = [
    { name: 'Spreadsheet Connection', func: testConnection },
    { name: 'Database Initialization', func: initializeDatabase },
    { name: 'Get Registration Count', func: getRegistrationCount }
  ];
  
  const results = [];
  
  tests.forEach(test => {
    try {
      const result = test.func();
      results.push({
        test: test.name,
        success: result.success !== false,
        message: result.message || 'OK',
        details: result
      });
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        message: error.message
      });
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    tests: results
  };
}
