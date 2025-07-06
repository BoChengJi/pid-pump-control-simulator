let chart = null, pidChart = null;

// 建立三台泵浦卡片
function createPumpCards(states) {
  const container = document.getElementById('pumpContainer');
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const card = document.createElement('div');
    card.className = 'pump-card' + (states[i] ? '' : ' off');
    card.id = `pump${i}`;
    card.innerHTML = `
      <img src="/static/img/pump.svg" alt="pump">
      <div>泵浦 ${i + 1}</div>
      <div>流量：<span id="flow${i}">0.0</span> m³/h</div>
      <div>功率：<span id="power${i}">0.0</span> kW</div>
      <button class="toggle-btn" onclick="togglePump(${i})">啟用 / 停用</button>
    `;
    container.appendChild(card);
  }
}

// 抓取後端數據，更新畫面
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    updateUI(data);
    updateCharts(data.history);
  } catch (err) {
    console.error('Fetch data error:', err);
  }
}

// 更新UI數據顯示
function updateUI(data) {
  const { pump_states, flows, powers, total_pressure, total_power, params } = data;

  document.getElementById('totalPressure').textContent = total_pressure.toFixed(2);
  document.getElementById('totalPower').textContent = total_power.toFixed(3);
  document.getElementById('targetPressure').textContent = params.target_pressure.toFixed(2);

  for (let i = 0; i < 3; i++) {
    document.getElementById(`flow${i}`).textContent = flows[i].toFixed(1);
    document.getElementById(`power${i}`).textContent = powers[i].toFixed(2);
    const card = document.getElementById(`pump${i}`);
    card.className = 'pump-card' + (pump_states[i] ? '' : ' off');
  }

  // PID 參數同步前端欄位
  document.getElementById('inputKp').value = params.Kp;
  document.getElementById('inputKi').value = params.Ki;
  document.getElementById('inputKd').value = params.Kd;
  document.getElementById('inputTargetPressure').value = params.target_pressure;
}

// 泵浦開關切換（模擬）
function togglePump(i) {
  fetch(`/api/toggle/${i}`, { method: 'POST' });
}

// 更新 PID 參數並送到後端
document.getElementById('btnUpdate').addEventListener('click', () => {
  const data = {
    Kp: parseFloat(document.getElementById('inputKp').value),
    Ki: parseFloat(document.getElementById('inputKi').value),
    Kd: parseFloat(document.getElementById('inputKd').value),
    target_pressure: parseFloat(document.getElementById('inputTargetPressure').value)
  };
  fetch('/api/update_params', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
});

// 更新圖表（歷史流量、壓力、功率 & PID參數）
function updateCharts(history) {
  if (!chart) {
    chart = new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels: history.timestamp.map(t => new Date(t * 1000).toLocaleTimeString()),
        datasets: [
          { label: '泵1 流量', data: history.pump1, borderColor: 'blue', fill: false, tension: 0.3 },
          { label: '泵2 流量', data: history.pump2, borderColor: 'green', fill: false, tension: 0.3 },
          { label: '泵3 流量', data: history.pump3, borderColor: 'orange', fill: false, tension: 0.3 },
          { label: '壓力', data: history.pressure, borderColor: 'red', fill: false, tension: 0.3 },
          { label: '總功率', data: history.power, borderColor: 'black', fill: false, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 10 } } }
        },
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 45, maxTicksLimit: 8 }},
          y: { beginAtZero: true }
        }
      }
    });

    pidChart = new Chart(document.getElementById('pidChart'), {
      type: 'line',
      data: {
        labels: history.timestamp.map(t => new Date(t * 1000).toLocaleTimeString()),
        datasets: [
          { label: 'Kp', data: history.Kp, borderColor: 'purple', fill: false, tension: 0.3 },
          { label: 'Ki', data: history.Ki, borderColor: 'pink', fill: false, tension: 0.3 },
          { label: 'Kd', data: history.Kd, borderColor: 'gray', fill: false, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 10 } } }
        },
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 45, maxTicksLimit: 8 }},
          y: { beginAtZero: true }
        }
      }
    });

  } else {
    chart.data.labels = history.timestamp.map(t => new Date(t * 1000).toLocaleTimeString());
    chart.data.datasets[0].data = history.pump1;
    chart.data.datasets[1].data = history.pump2;
    chart.data.datasets[2].data = history.pump3;
    chart.data.datasets[3].data = history.pressure;
    chart.data.datasets[4].data = history.power;
    chart.update();

    pidChart.data.labels = history.timestamp.map(t => new Date(t * 1000).toLocaleTimeString());
    pidChart.data.datasets[0].data = history.Kp;
    pidChart.data.datasets[1].data = history.Ki;
    pidChart.data.datasets[2].data = history.Kd;
    pidChart.update();
  }
}

// 初始化建立泵浦卡，預設兩台啟動、一台停用
createPumpCards([1, 1, 0]);

// 每秒向後端請求資料並更新介面
setInterval(fetchData, 1000);
