// 1️⃣ LOAD DATA
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
    .select('precipitation');

var provincesFC = ee.FeatureCollection("FAO/GAUL/2015/level1")
                     .filter(ee.Filter.eq('ADM0_NAME', 'Pakistan'));

// Province names mapping: dataset name → display name
var provinceMapping = {
  'Punjab': 'Punjab',
  'Sindh': 'Sindh',
  'North-West Frontier': 'Khyber Pakhtunkhwa',
  'Balochistan': 'Balochistan',
  'Federally Administered Tribal Areas': 'FATA',
  'Islamabad': 'Islamabad'
};

var years = ee.List.sequence(2015, 2025);
Map.centerObject(provincesFC, 5);

// Function to create trend + chart + export CSV
function createProvinceTrend(datasetName, displayName){
  var province = provincesFC.filter(ee.Filter.eq('ADM1_NAME', datasetName));

  var trendFC = ee.FeatureCollection(
    years.map(function(y){
      var year = ee.Number(y);

      var annual = chirps.filterDate(ee.Date.fromYMD(year,1,1), ee.Date.fromYMD(year,12,31))
                         .sum()
                         .clip(province);

      var meanDict = annual.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: province.geometry(),
        scale: 5000,
        maxPixels: 1e13
      });

      return ee.Feature(province.geometry())
               .set('year', year)
               .set('mean', meanDict.get('precipitation'))
               .set('Province', displayName);
    })
  );

  trendFC = trendFC.filter(ee.Filter.notNull(['mean','year']));

  // Chart
  var chart = ui.Chart.feature.byFeature({
    features: trendFC,
    xProperty: 'year',
    yProperties: ['mean']
  })
  .setChartType('LineChart')
  .setOptions({
    title: displayName + ' Rainfall Trend (2015–2025)',
    hAxis: {title: 'Year'},
    vAxis: {title: 'Average Rainfall (mm)'},
    trendlines: {0: {type: 'linear', showR2: true}},
    lineWidth: 2,
    pointSize: 4
  });

  print(chart);

  // Export CSV
  Export.table.toDrive({
    collection: trendFC,
    description: displayName.replace(/ /g,'_') + '_Rainfall_Trend_2015_2025',
    fileFormat: 'CSV'
  });
}

// Loop through all provinces
for (var key in provinceMapping){
  createProvinceTrend(key, provinceMapping[key]);
}
