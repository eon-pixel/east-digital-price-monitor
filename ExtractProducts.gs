function extractProducts() {
  var urls = [
    { url: "https://east-digital.myshopify.com/collections/factory-recertified", sheetName: "Category - HDD(FR)" },
    { url: "https://east-digital.myshopify.com/collections/hdd", sheetName: "Category - HDD(New)" },
    { url: "https://east-digital.myshopify.com/collections/pulls-hdd", sheetName: "Category - HDD(Pulls)" }
  ];

  urls.forEach(function(entry) {
    processUrl(entry.url, entry.sheetName);
  });

  // Sort each sheet by date after processing all URLs
  urls.forEach(function(entry) {
    sortSheetsByDate(entry.sheetName);
  });
}

function processUrl(baseUrl, sheetName) {
  var options = {
    'method': 'get',
    'headers': {
      'Accept-Language': 'en-NZ',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      'Cookie': 'localization=NZ'
    }
  };

  var page = 1;
  var hasMorePages = true;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.appendRow(['Product Name', 'Regular Price (NZD)', 'Sale Price (NZD)', 'Date', 'Drive Size (TB)', 'Price per TB (NZD)', 'Stock Status', 'On Sale']);
  } else {
    var firstRow = sheet.getRange(1, 1, 1, 8).getValues()[0];
    if (firstRow[0] !== 'Product Name' || firstRow[1] !== 'Regular Price (NZD)' || firstRow[2] !== 'Sale Price (NZD)' || firstRow[3] !== 'Date' || firstRow[4] !== 'Drive Size (TB)' || firstRow[5] !== 'Price per TB (NZD)' || firstRow[6] !== 'Stock Status' || firstRow[7] !== 'On Sale') {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, 8).setValues([['Product Name', 'Regular Price (NZD)', 'Sale Price (NZD)', 'Date', 'Drive Size (TB)', 'Price per TB (NZD)', 'Stock Status', 'On Sale']]);
    }
  }

  while (hasMorePages) {
    var url = baseUrl + "?page=" + page;
    var response = UrlFetchApp.fetch(url, options);
    var html = response.getContentText();
    var $ = Cheerio.load(html);
    var products = $(".grid__item");

    var noProductsMessage = $("#ProductGridContainer .collection--empty .title.title--primary").length > 0;

    if (products.length === 0 || noProductsMessage) {
      hasMorePages = false;
    } else {
      products.each(function() {
        var productName = $(this).find('.h5').text().trim();
        var productUrl = $(this).find('a').attr('href');
        if (productUrl) {
          productUrl = "https://east-digital.myshopify.com" + productUrl;
        }
        var regularPrice = $(this).find('.price-item--regular').text().trim();
        var salePrice = $(this).find('.price__sale').text().trim();
        
        // Converting prices to numbers
        regularPrice = parseFloat(regularPrice.replace(/[^0-9.-]+/g, ""));
        salePrice = salePrice ? parseFloat(salePrice.replace(/[^0-9.-]+/g, "")) : 0;

        // In Stock Check
        var stockStatus = "In Stock";
        var priceWrapper = $(this).find('.price');
        
        if (priceWrapper.find('.badge:contains("Sold out")').length > 0 || 
            priceWrapper.hasClass('price--sold-out')) {
          stockStatus = "Out of Stock";
        }

        // Check if the product is on sale
        var onSale = $(this).find('.badge:contains("Sale")').length > 0 ? "Yes" : "No";

        if (productName && productUrl && regularPrice) {
          var escapedProductName = productName.replace(/"/g, '""');
          var productNameWithLink = `=HYPERLINK("${productUrl}", "${escapedProductName}")`;

          var date = new Date().toLocaleDateString();

          // Extract drive size from product name
          var driveSizeMatch = productName.match(/(\d+)\s?TB/i);
          var driveSize = driveSizeMatch ? parseInt(driveSizeMatch[1]) : '';

          Logger.log("Product URL: " + productUrl);
          Logger.log("Product Name: " + productName + " | Regular Price (NZD): " + regularPrice + " | Sale Price (NZD): " + salePrice + " | Date: " + date + " | Drive Size: " + driveSize + " | Stock Status: " + stockStatus + " | On Sale: " + onSale );

          sheet.appendRow([productNameWithLink, regularPrice, salePrice, date, driveSize, '', stockStatus, onSale]);
        }
      });
      page++;
    }
  }

  // Add the "Price per TB (NZD)" column and fill it with the formula
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    //var formula = `=B${i}/E${i}`;
    var formula = `=IF(C${i}<1, B${i}/E${i}, MIN(B${i}, C${i})/E${i})`;
    sheet.getRange(i, 6).setFormula(formula);
  }
}

function sortSheetsByDate(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet) {
    var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    range.sort({ column: 4, ascending: false });
  }
}
