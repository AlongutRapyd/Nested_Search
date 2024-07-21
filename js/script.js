function convertJson() {
    const inputJson = document.getElementById('jsonInput').value.trim();
    try {
      const input_data = JSON.parse(inputJson);
  
      const must_not_phrases = input_data.query.bool.must_not.reduce((acc, filter, index) => {
        if (filter.match_phrase) {
          const prefix = index === 0 ? 'NOT' : 'AND NOT';
          Object.entries(filter.match_phrase).forEach(([key, value]) => {
            acc.push(`${prefix} ${key}: "${value}"`);
          });
        }
        return acc;
      }, []);
  
      const other_clauses = input_data.query.bool.filter.reduce((acc, filter, index) => {
        if (filter.match_phrase) {
          const prefix = acc.length === 0 && must_not_phrases.length === 0 ? '' : 'AND';
          Object.entries(filter.match_phrase).forEach(([key, value]) => {
            acc.push(`${prefix} ${key}: "${value}"`);
          });
        } else if (filter.bool && filter.bool.filter) { // Handle nested bool filter
          const nested_clauses = filter.bool.filter.reduce((nested_acc, nested_filter) => {
            if (nested_filter.multi_match && nested_filter.multi_match.query) {
              nested_acc.push(`"${nested_filter.multi_match.query}"`);
            }
            return nested_acc;
          }, []);
          if (nested_clauses.length > 0) {
            const prefix = acc.length === 0 && must_not_phrases.length === 0 ? '' : 'AND';
            acc.push(`${prefix} ${nested_clauses.join(' AND ')}`);
          }
        }
        return acc;
      }, []);
  
      const output = `${must_not_phrases.join(' ')} ${other_clauses.join(' ')}`.trim();
      document.getElementById('nestedOutput').value = output;
    } catch (error) {
      document.getElementById('nestedOutput').value = 'Invalid input!';
    }
  }
  
  
  function copyOutput(outputId) {
    var outputTextarea = document.getElementById(outputId);
    outputTextarea.select();  
    document.execCommand('copy');
}


      function handleConvertButtonClick() {
        const nestedQueryRadio = document.getElementById('nestedQueryRadio');
        const alertQueryRadio = document.getElementById('alertQueryRadio');
        const nestedJsonInputCol = document.getElementById('nestedJsonInputCol');
        const nestedOutputCol = document.getElementById('nestedOutputCol');
        
        if (nestedQueryRadio.checked) {
            // Display the nested query input fields
            nestedJsonInputCol.classList.add('col-lg-6');
            nestedOutputCol.classList.add('col-lg-6');
            nestedJsonInputCol.style.display = 'block';
            nestedOutputCol.style.display = 'block';
            document.getElementById('alertQueryInput').style.display = 'none';
        } else if (alertQueryRadio.checked) {
            // Display the alert query input fields
            nestedJsonInputCol.classList.remove('col-lg-6');
            nestedOutputCol.classList.remove('col-lg-6');
            nestedJsonInputCol.style.display = 'none';
            nestedOutputCol.style.display = 'none';
            document.getElementById('alertQueryInput').style.display = 'block';
        } else {
            // Neither radio button is selected, handle accordingly
            console.error('No query type selected');
        }
    }       

    let conditionCount = 0; // Initialize a counter for condition IDs

    function addQueryInput() {
        const queryInputs = document.getElementById('queryInputs');
        const template = document.getElementById('queryInputTemplate');
        const clone = template.content.cloneNode(true);
    
        // Increment the condition counter to generate a unique ID for the condition container
        conditionCount++;
    
        // Create a unique ID for the condition container
        const conditionId = `condition_${conditionCount}`;
    
        // Set the ID for the cloned template element
        clone.querySelector('.condition-container').id = conditionId;
    
        // Append the cloned template to the parent container
        queryInputs.appendChild(clone);
    }
    
    function removeQueryInput(button) {
      const conditionContainer = button.closest('.condition-container');
      if (conditionContainer) {
          conditionContainer.remove();
      }
  }
  
  function convertAlert() {
    const alertTimeFrameElement = document.getElementById('alertTimeFrame');
    if (!alertTimeFrameElement) {
        console.error('Alert time frame element not found.');
        return;
    }

    const alertTimeFrame = alertTimeFrameElement.value;

    // Retrieve all condition inputs
    const conditionInputs = document.querySelectorAll('#queryInputs .condition-container');

    // Initialize arrays to store filter conditions
    const mustFilters = [];
    const filterConditions = [];
    const mustNotFilters = [];

    // Loop through each condition input
    conditionInputs.forEach((conditionInput) => {
        // Retrieve key and value of each condition
        const keyInput = conditionInput.querySelector('input[placeholder="Key"]');
        const valueInput = conditionInput.querySelector('input[placeholder="Value"]');

        if (keyInput && valueInput) {
            const key = keyInput.value.trim();
            const value = valueInput.value.trim();

            // Construct the match_phrase object for the condition
            const matchPhrase = {
                query: value,
                slop: 0,
                zero_terms_query: "NONE",
                boost: 1
            };

            // Construct the match_phrase filter object
            const matchPhraseFilter = { match_phrase: { [key]: matchPhrase } };

            // Push to filterConditions array as "AND" operation
            filterConditions.push(matchPhraseFilter);
        }
    });

    // Construct the range object for the time frame
    const timeRange = {
        range: {
            time: {
                from: alertTimeFrame,
                to: "now",
                include_lower: true,
                include_upper: true,
                boost: 1
            }
        }
    };

    // Construct the query object
    const query = {
        size: 0,
        query: {
            bool: {
                must: [timeRange].concat(mustFilters),
                filter: filterConditions,
                must_not: mustNotFilters,
                adjust_pure_negative: true,
                boost: 1
            }
        }
    };

    // Convert the query object to JSON string with indentation for readability
    const outputJson = JSON.stringify(query, null, 4);

    // Display the generated query in the output textarea
    document.getElementById('alertOutput').value = outputJson;
}

function handleQueryMethodChange() {
  const conditionQuerySection = document.getElementById('conditionQuerySection');
  const jsonQuerySection = document.getElementById('jsonQuerySection');
  const conditionQueryRadio = document.getElementById('conditionQueryRadio');
  const jsonQueryRadio = document.getElementById('jsonQueryRadio');

  if (conditionQueryRadio.checked) {
      conditionQuerySection.style.display = 'block';
      jsonQuerySection.style.display = 'none';
  } else if (jsonQueryRadio.checked) {
      conditionQuerySection.style.display = 'none';
      jsonQuerySection.style.display = 'block';
  }
}

function convertJsonQuery() {
  const inputJsonStr = document.getElementById('jsonInput2').value.trim(); // Update the ID here
  const alertTimeFrame = document.getElementById('alertTimeFrame2').value;

  if (!inputJsonStr) { // Check if inputJsonStr is empty
      document.getElementById('jsonOutput2').value = "Error: Input JSON is empty."; // Update the ID here
      return;
  }

  try {
      const inputJson = JSON.parse(inputJsonStr);
      const outputJson = generateOutputJsonQuery(inputJson, alertTimeFrame); // Pass inputJson and alertTimeFrame to generateOutputJsonQuery()
      document.getElementById('jsonOutput2').value = JSON.stringify(outputJson, null, 4); // Update the ID here
  } catch (error) {
      document.getElementById('jsonOutput2').value = "Error parsing input JSON: " + error.message; // Update the ID here
  }
}

function generateOutputJsonQuery(inputJson, alertTimeFrame) {
  const outputJson = {
      size: 0,
      query: {
          bool: {
              must: [],
              filter: [],
              must_not: [],
              adjust_pure_negative: true,
              boost: 1
          }
      }
  };

  // Construct the range object for the time frame
  const timeRange = {
      range: {
          time: {
              from: alertTimeFrame,
              to: "now",
              include_lower: true,
              include_upper: true,
              boost: 1
          }
      }
  };

  // Set the time range filter
  outputJson.query.bool.must.push(timeRange);

  // Set the query from input JSON
  if (inputJson && inputJson.query) {
      const inputQuery = inputJson.query;
      if (inputQuery.bool && inputQuery.bool.filter) {
          const timeFilterIndex = inputQuery.bool.filter.findIndex(filter => filter.range && filter.range.time);
          if (timeFilterIndex !== -1) {
              inputQuery.bool.filter.splice(timeFilterIndex, 1); // Remove the time range filter
          }
          outputJson.query.bool.filter = outputJson.query.bool.filter.concat(inputQuery.bool.filter);
      }
  }

  return outputJson;
}

function generateEmails() {
  var payoutData = document.getElementById('payoutData').value.trim();

  if (!payoutData) {
      showAlert('Please paste payout data.');
      return;
  }

  var payouts = parsePayoutData(payoutData);

  if (payouts.length === 0) {
      showAlert('No valid payout data found.');
      return;
  }

  var outputDiv = document.getElementById('output');
  outputDiv.innerHTML = '';

  var emails = generateEmailsByGateway(payouts);
  emails.forEach(email => {
      outputDiv.innerHTML += email;
  });
}

function parsePayoutData(data) {
  var lines = data.split('\n');
  var payouts = [];

  // Start from 1 to skip the header row
  for (var i = 1; i < lines.length; i++) {
      var columns = lines[i].split('\t');

      // Check if the columns are valid
      if (columns.length >= 11) {
          var payoutDetails = {
              gatewayName: columns[3],
              payoutToken: columns[1],
              externalId: columns[2],
              createdDate: columns[6],
              amount: columns[10]
          };

          payouts.push(payoutDetails);
      }
  }

  return payouts;
}

function generateEmailsByGateway(payouts) {
  var emails = {};
  payouts.forEach(payout => {
      if (!emails[payout.gatewayName]) {
          emails[payout.gatewayName] = '<div class="alert alert-primary" role="alert"><h4>' + payout.gatewayName + '</h4>Dear Team,<br>I hope this email finds you well.<br>May you please assist us and clarify for us what is the status of the following payouts for ' + payout.gatewayName + '?<br>In case it failed, please let us know what was the failure reason.<br>In case the payout is closed may you please provide us proof of deposit?<br><br><table class="table table-bordered"><thead class="table-light"><tr><th>Payout Token</th><th>External Id</th><th>Created Date</th><th>Amount</th></tr></thead><tbody>';
      }
      emails[payout.gatewayName] += '<tr>';
      emails[payout.gatewayName] += '<td>' + payout.payoutToken + '</td>';
      emails[payout.gatewayName] += '<td>' + payout.externalId + '</td>';
      emails[payout.gatewayName] += '<td>' + payout.createdDate + '</td>';
      emails[payout.gatewayName] += '<td>' + payout.amount + '</td>';
      emails[payout.gatewayName] += '</tr>';
  });
  for (var gatewayName in emails) {
      emails[gatewayName] += '</tbody></table>Looking forward to your response.<br>Best Regards,</div>';
  }
  return Object.values(emails);
}

function showAlert(message) {
  var alertDiv = document.createElement('div');
  alertDiv.classList.add('alert', 'alert-danger', 'mt-3'); // Add margin top for spacing
  alertDiv.textContent = message;
  
  // Get the parent element of the textarea and the button
  var form = document.getElementById('payoutsForm');
  
  // Insert the alert before the button
  form.insertBefore(alertDiv, form.querySelector('button'));
  
  // Remove the alert after 3 seconds
  setTimeout(function() {
      alertDiv.remove();
  }, 3000);
}

function extractPaymentAndPayoutTokens() {
  const inputData = document.getElementById('inputData').value.trim();

  // Check if input data is empty
  if (!inputData) {
    showError('Input data is empty.');
    return;
  }

  // Split the input data into words
  const words = inputData.split(/\s+/);

  // Arrays to store tokens
  let paymentTokens = [];
  let payoutTokens = [];

  // Iterate through the words to find payment_token and payout_token
  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'payment_token:') {
      if (i + 1 < words.length) {
        paymentTokens.push(words[i + 1]);
      }
    } else if (words[i] === 'payout_token:') {
      if (i + 1 < words.length) {
        payoutTokens.push(words[i + 1]);
      }
    }
  }

  // Prepare output in ordered list format
  let output = '<div>Payment Tokens:<ol>';
  paymentTokens.forEach((token, index) => {
    output += `<li>${token}</li>`;
  });
  output += '</ol></div>';

  output += '<div>Payout Tokens:<ol>';
  payoutTokens.forEach((token, index) => {
    output += `<li>${token}</li>`;
  });
  output += '</ol></div>';

  // Display the output
  const outputDiv = document.getElementById('output');
  outputDiv.innerHTML = output;
  outputDiv.style.display = 'block';
}

function showError(message) {
  const outputDiv = document.getElementById('output');
  outputDiv.innerHTML = `<p>Error: ${message}</p>`;
  outputDiv.style.display = 'block';
}

