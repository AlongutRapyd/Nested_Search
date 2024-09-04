function analyzeLogs() {
  // Get the logs from the textarea
  const logs = document.getElementById('logInput').value;

  // Display loading message
  document.getElementById('analysisResults').innerHTML = '<div class="text-center mb-4"><p class="lead">Analyzing logs, please wait...</p></div>';

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

  // Function to generate HTML for a single occurrence
  function generateOccurrenceHtml(index, details) {
    return `
      <div class="card mb-3 shadow-sm border-info">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">Occurrence ${index + 1}</h5>
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
            <summary class="btn btn-info btn-sm">Show Params</summary>
            <pre><code>${details.params}</code></pre>
          </details>
        </div>
      </div>
    `;
  }

  // Parse the logs
  const hits = parseLogs(logs);

  // Analyze logs for errors
  let results = `<h2 class="mb-4">Log Analysis Results</h2>`;
  results += `<div class="alert alert-info mb-4" role="alert">Total Hits: ${totalHits}</div>`;

  // Create a placeholder for the canvases
  results += '<div class="row" id="canvasPlaceholder"></div>';

  // Wrap results in a list
  let occurrencesHtml = '';
  let occurrenceIndex = 0;
  hits.forEach((hit) => {
    const logEntry = JSON.stringify(hit._source); // Convert hit to a JSON string for pattern matching
    if (matchesPatterns(logEntry, errorPatterns)) {
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
  results += '<h3 class="mt-4">Label Counts</h3>';
  results += '<ul class="list-group mb-4">';
  sortedLabels.forEach(([label, count]) => {
    results += `<li class="list-group-item d-flex justify-content-between align-items-center"><span class="badge bg-info rounded-pill"> ${label}</span> <span class="badge bg-primary rounded-pill">${count}</span></li>`;
  });
  results += '</ul>';

  // Display the results
  document.getElementById('analysisResults').innerHTML = results + occurrencesHtml || '<div class="alert alert-warning" role="alert">No significant issues detected.</div>';

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
