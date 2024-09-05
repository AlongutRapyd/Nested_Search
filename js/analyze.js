// analyze.js

function analyzeLogs() {
  // Get the logs from the textarea
  const logs = document.getElementById('logInput').value;

  // Display loading message
  document.getElementById('analysisResults').innerHTML = '<div class="text-center mb-4"><p class="lead"><i class="fas fa-spinner fa-spin"></i> Analyzing logs, please wait...</p></div>';

  // Extract the total number of hits
  const totalHitsPattern = /"hits":\s*{[^}]*"total":\s*(\d+)/;
  const totalHitsMatch = logs.match(totalHitsPattern);
  const totalHits = totalHitsMatch ? totalHitsMatch[1] : 'Not found';

  // Define patterns and keywords to look for
  const errorPatterns = [
    /ERROR:.*(Timeout|Failure|Exception)/gi,  // Common error keywords
    /Exception:\s*\w+/gi
  ];

  // Function to parse the entire log input into JSON
  function parseLogs(logs) {
    try {
      const logData = JSON.parse(logs);
      return logData.hits ? logData.hits.hits : [];
    } catch (e) {
      console.error('Failed to parse logs as JSON:', e);
      return [];
    }
  }

// Function to extract and format request and response details from connectors service hits
function extractConnectorsServiceDetails(hits) {
  const connectorsServiceDetails = [];

  // Regular expressions to match URIs or URLs
  const uriOrUrlPattern = /https?:\/\/[^\s]+/i;
  // Regular expression to match HTTP methods
  const httpMethodPattern = /method:\s*'(POST|GET|PUT|DELETE|PATCH|OPTIONS|HEAD)'/i;

  hits.forEach(hit => {
    const source = hit._source;

    // Check if label matches '_connectors_service'
    if (/.*_connectors_service/.test(source.label)) {
      const message = source.message || '';
      const params = source.params || '';

      // Check if params contain URI/URL and HTTP method
      const containsUriOrUrl = uriOrUrlPattern.test(params);
      const containsHttpMethod = httpMethodPattern.test(params);

      // Find request logs with URI/URL and HTTP method in params
      if (
        (/options_data/.test(message) || /input/.test(message)) &&
        containsUriOrUrl &&
        containsHttpMethod
      ) {
        connectorsServiceDetails.push({
          label: source.label || 'N/A',
          level: source.level || 'N/A',
          message: message,
          time: source.time || 'N/A',
          params: `Request: ${params}`,
          type: 'request'
        });
      }

      // Find response logs
      if (
        (/makeRawRequest/.test(message) || /makeCustomRequest/.test(message)) &&
        (
          /error/.test(message) ||
          (
            /response/.test(message) && ! /resolve_with_full_response/.test(message)
          )
        )
      ) {
        connectorsServiceDetails.push({
          label: source.label || 'N/A',
          level: source.level || 'N/A',
          message: message,
          time: source.time || 'N/A',
          params: `Response: ${params}`,
          type: 'response'
        });
      }
    }
  });

  return connectorsServiceDetails;
}

// Function to generate HTML for connectors service details
function generateConnectorsServiceHtml(details) {
  let html = '<h3 class="mt-4">Connectors Service Details</h3>';
  
  details.forEach((detail, index) => {
    let icon;
    if (detail.type === 'request') {
      icon = '<i class="fas fa-sign-in-alt"></i>'; // Icon for request
    } else if (detail.type === 'response') {
      icon = '<i class="fas fa-sign-out-alt"></i>'; // Icon for response
    }

    html += `
      <div class="card mb-3 shadow-sm border-info">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">${icon} ${detail.type.charAt(0).toUpperCase() + detail.type.slice(1)} ${index + 1} <i class="fas fa-exclamation-triangle"></i></h5>
        </div>
        <div class="card-body">
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Label:</strong></div>
            <div class="col-sm-9"><span class="badge bg-secondary">${detail.label}</span></div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Level:</strong></div>
            <div class="col-sm-9"><span class="badge bg-warning text-dark">${detail.level}</span></div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Message:</strong></div>
            <div class="col-sm-9">${detail.message}</div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Time:</strong></div>
            <div class="col-sm-9">${detail.time}</div>
          </div>
          <details class="mt-3">
            <summary class="btn btn-danger btn-sm"><i class="fas fa-cogs"></i> Show Params</summary>
            <pre><code>${detail.params}</code></pre>
          </details>
        </div>
      </div>
    `;
  });

  return html;
}

  // Function to extract and format detailed information
  function extractDetails(hit) {
    return {
      label: hit._source.label || 'N/A',
      level: hit._source.level || 'N/A',
      message: hit._source.message || 'N/A',
      time: hit._source.time || 'N/A',
      params: hit._source.params ? JSON.stringify(hit._source.params, null, 2) : 'N/A'
    };
  }

  // Function to check if any pattern matches the log entry
  function matchesPatterns(logEntry, patterns) {
    return patterns.some(pattern => pattern.test(logEntry));
  }

  // Function to extract unique important details from the params field without JSON parsing
  function extractUniqueDetails(hits) {
    const uniqueDetails = {};

    // Define exact field names to look for and their regular expressions
    const fieldPatterns = {
      payment_token: /payment_token:\s*'([^']*)'/,
      payment_original_amount: /payment_original_amount:\s*'([^']*)'/,
      payment_currency_code: /payment_currency_code:\s*'([^']*)'/,
      payment_failure_code: /payment_failure_code:\s*'([^']*)'/,
      payment_failure_message: /payment_failure_message:\s*'([^']*)'/,
      payment_method_type_type: /payment_method_type_type:\s*'([^']*)'/,
      reference_id: /reference_id:\s*'([^']*)'/,
      gateway: /gc_type:\s*'([^']*)'/,
      payout_token: /payout_token:\s*'([^']*)'/,
      payout_original_amount: /payout_original_amount:\s*'([^']*)'/,
      payout_currency_code: /payout_currency_code:\s*'([^']*)'/,
      payout_failure_code: /payout_failure_code:\s*'([^']*)'/,
      payout_failure_message: /payout_failure_message:\s*'([^']*)'/,
      payout_method_type_type: /payout_method_type_type:\s*'([^']*)'/
    };

    // Iterate over each hit to find the fields inside the params
    hits.forEach((hit) => {
      const source = hit._source;

      // Check if params field exists and is not empty
      if (source.params) {
        // Search for each field pattern in the params string
        Object.keys(fieldPatterns).forEach((fieldName) => {
          const pattern = fieldPatterns[fieldName];
          const match = source.params.match(pattern);
          
          if (match && match[1]) {
            // Normalize the value by trimming whitespace
            const normalizedValue = match[1].trim();
            
            // Only set if it hasn't been set yet
            if (!uniqueDetails[fieldName]) {
              uniqueDetails[fieldName] = normalizedValue;
              console.log(`Found ${fieldName}: ${normalizedValue}`); // Log the found value
            }
          }
        });
      }
    });

    // Log the entire uniqueDetails object
    console.log('Unique Details Extracted:', uniqueDetails);

    return uniqueDetails;
  }

  // Function to generate HTML for a single occurrence
  function generateOccurrenceHtml(index, details) {
    return `
      <div class="card mb-3 shadow-sm border-danger">
        <div class="card-header bg-danger text-white">
          <h5 class="card-title mb-0">Occurrence ${index + 1} <i class="fas fa-exclamation-triangle"></i></h5>
        </div>
        <div class="card-body">
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Label:</strong></div>
            <div class="col-sm-9"><span class="badge bg-secondary">${details.label}</span></div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Level:</strong></div>
            <div class="col-sm-9"><span class="badge bg-warning text-dark">${details.level}</span></div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Message:</strong></div>
            <div class="col-sm-9">${details.message}</div>
          </div>
          <div class="row mb-2">
            <div class="col-sm-3"><strong>Time:</strong></div>
            <div class="col-sm-9">${details.time}</div>
          </div>
          <details class="mt-3">
            <summary class="btn btn-danger btn-sm"><i class="fas fa-cogs"></i> Show Params</summary>
            <pre><code>${details.params}</code></pre>
          </details>
        </div>
      </div>
    `;
  }

  // Function to generate HTML for the table of unique details
  function generateDetailsTable(uniqueDetails) {
    let tableHtml = '<h3 class="mt-4">Important Details <i class="fas fa-info-circle"></i></h3>';
    tableHtml += '<table class="table table-striped mb-4">';
    tableHtml += '<thead><tr><th>Field</th><th>Value</th></tr></thead>';
    tableHtml += '<tbody>';

    Object.keys(uniqueDetails).forEach(field => {
      const value = uniqueDetails[field];
      tableHtml += `<tr><td>${field}</td><td>${value}</td></tr>`;
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
  }

  // Parse the logs
  const hits = parseLogs(logs);

  // Analyze logs for errors
  let results = `<h2 class="mb-4">Log Analysis Results <i class="fas fa-chart-line"></i></h2>`;
  results += `<div class="alert alert-info mb-4" role="alert"><i class="fas fa-tachometer-alt"></i> Total Hits: ${totalHits}</div>`;

  // Create a placeholder for the canvases
  results += '<div class="row" id="canvasPlaceholder"></div>';

  // Wrap results in a list
  let occurrencesHtml = '';
  let occurrenceIndex = 0;
  hits.forEach((hit) => {
    const source = hit._source;

    // Check if the label is 'error' or 'warning'
    if (source.level === 'error' || source.level === 'warning') {
      const details = extractDetails(hit);
      occurrencesHtml += generateOccurrenceHtml(occurrenceIndex++, details);
    }
  });

  // Count occurrences by label
  const labelPattern = /"label":\s*"([^"]+)"/gi;
  let labelCounts = {};

  // Extract and count labels
  hits.forEach(hit => {
    const logEntry = JSON.stringify(hit._source); // Convert hit to a JSON string
    let labelMatch;
    while ((labelMatch = labelPattern.exec(logEntry)) !== null) {
      const label = labelMatch[1];
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    }
  });

  // Sort labels by count (descending)
  const sortedLabels = Object.entries(labelCounts).sort((a, b) => b[1] - a[1]);

  // Add label counts to results
  results += '<h3 class="mt-4">Label Counts <i class="fas fa-tag"></i></h3>';
  results += '<ul class="list-group mb-4">';
  sortedLabels.forEach(([label, count]) => {
    results += `<li class="list-group-item d-flex justify-content-between align-items-center"><span class="badge bg-info rounded-pill"> ${label}</span> <span class="badge bg-primary rounded-pill">${count}</span></li>`;
  });
  results += '</ul>';

  // Extract and display important details
  const uniqueDetails = extractUniqueDetails(hits);
  if (Object.keys(uniqueDetails).length > 0) {
    results += generateDetailsTable(uniqueDetails);
  }

  // Extract and display connectors service details
  const connectorsServiceDetails = extractConnectorsServiceDetails(hits);
  if (connectorsServiceDetails.length > 0) {
    results += generateConnectorsServiceHtml(connectorsServiceDetails);
  }

  // Display the results
  document.getElementById('analysisResults').innerHTML = results + occurrencesHtml || '<div class="alert alert-warning" role="alert"><i class="fas fa-exclamation-circle"></i> No significant issues detected.</div>';

  // Extract timing data from ISO 8601 time
  const timingData = hits.map(hit => new Date(hit._source.time).getTime()).filter(time => !isNaN(time));

  // Extract log levels
  const logLevels = hits.map(hit => hit._source.level || 'N/A');

  // Create timing histogram chart
  if (timingData.length > 0) {
    let canvas = document.getElementById('timingChart');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'timingChart';
      canvas.width = 300;
      canvas.height = 100; // Adjust the height to be smaller
      canvas.style.border = '1px solid #ddd'; // Optional: border for visual clarity
    }
    const container = document.createElement('div');
    container.className = 'col-md-6 mb-4'; // Bootstrap column class for half-width
    container.style.maxWidth = '50%';
    container.style.height = '300px';
    container.appendChild(canvas);
    document.getElementById('canvasPlaceholder').appendChild(container);

    // Convert timestamps to time intervals (e.g., 1-minute intervals)
    const minTime = Math.min(...timingData);
    const maxTime = Math.max(...timingData);
    const interval = 60 * 1000; // 1-minute intervals

    const histogramData = [];
    for (let start = minTime; start <= maxTime; start += interval) {
      const end = start + interval;
      const count = timingData.filter(time => time >= start && time < end).length;
      histogramData.push({
        interval: new Date(start).toLocaleTimeString(),
        count: count
      });
    }

    // Create histogram chart
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: histogramData.map(data => data.interval),
        datasets: [{
          label: 'Number of Hits',
          data: histogramData.map(data => data.count),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Allow custom size
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Hits'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(tooltipItem) {
                return `Interval: ${tooltipItem.label}, Hits: ${tooltipItem.raw}`;
              }
            }
          }
        }
      }
    });
  } else {
    console.log('No timing data available for histogram.');
  }

  // Create pie chart for log levels
  const levelCounts = logLevels.reduce((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
  const levelLabels = Object.keys(levelCounts);
  const levelData = Object.values(levelCounts);

  const pieCanvas = document.createElement('canvas');
  pieCanvas.id = 'logLevelPieChart';
  pieCanvas.width = 300; // Adjusted width
  pieCanvas.height = 100; // Adjusted height
  pieCanvas.style.border = '1px solid #ddd'; // Optional: border for visual clarity
  const pieContainer = document.createElement('div');
  pieContainer.className = 'col-md-6 mb-4'; // Bootstrap column class for half-width
  pieContainer.style.maxWidth = '50%';
  pieContainer.style.height = '300px';
  pieContainer.appendChild(pieCanvas);
  document.getElementById('canvasPlaceholder').appendChild(pieContainer);

  new Chart(pieCanvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: levelLabels,
      datasets: [{
        label: 'Log Level Distribution',
        data: levelData,
        backgroundColor: ['rgba(75, 192, 192, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)', 'rgba(255, 99, 132, 0.2)'],
        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allow custom size
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `${tooltipItem.label}: ${tooltipItem.raw} logs`;
            }
          }
        }
      }
    }
  });
}