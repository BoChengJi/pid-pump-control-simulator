from flask import Flask, render_template, jsonify, request
import time

app = Flask(__name__)

params = {'Kp': 2.0, 'Ki': 0.5, 'Kd': 0.1, 'target_pressure': 4.0}
pump_states = [1, 1, 0]
flows = [0.0, 0.0, 0.0]
powers = [0.0, 0.0, 0.0]
current_pressure = 0.0
integral, prev_error, prev_time = 0.0, 0.0, time.time()

history = {
    'timestamp': [],
    'pump1': [], 'pump2': [], 'pump3': [],
    'pressure': [], 'power': [],
    'Kp': [], 'Ki': [], 'Kd': []
}

def pid_control(target, current):
    global integral, prev_error, prev_time
    now = time.time()
    dt = max(now - prev_time, 1e-3)
    error = target - current
    integral += error * dt
    derivative = (error - prev_error) / dt
    output = params['Kp'] * error + params['Ki'] * integral + params['Kd'] * derivative
    prev_error = error
    prev_time = now
    return output

def update_simulation():
    global current_pressure, flows, powers
    pressure_delta = pid_control(params['target_pressure'], current_pressure)
    current_pressure += pressure_delta * 0.05
    current_pressure = max(0.0, current_pressure)

    running = sum(pump_states)
    if running < 2:
        for i in range(3):
            if pump_states[i] == 0:
                pump_states[i] = 1
                running += 1
                if running >= 2:
                    break

    for i in range(3):
        flows[i] = 15 if pump_states[i] else 0
        powers[i] = 4 if pump_states[i] else 0

    total_power = sum(powers)
    ts = int(time.time())

    history['timestamp'].append(ts)
    history['pump1'].append(flows[0])
    history['pump2'].append(flows[1])
    history['pump3'].append(flows[2])
    history['pressure'].append(current_pressure)
    history['power'].append(total_power)
    history['Kp'].append(params['Kp'])
    history['Ki'].append(params['Ki'])
    history['Kd'].append(params['Kd'])

    if len(history['timestamp']) > 40:
        for key in history:
            history[key] = history[key][-40:]

    return current_pressure, flows, powers, pump_states, total_power

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    pressure, flows_, powers_, states, total_power = update_simulation()
    return jsonify({
        'pump_states': states,
        'flows': flows_,
        'powers': powers_,
        'total_pressure': pressure,
        'total_power': total_power,
        'params': params,
        'history': history
    })

@app.route('/api/update_params', methods=['POST'])
def update_params():
    data = request.json
    for key in ['Kp', 'Ki', 'Kd', 'target_pressure']:
        try:
            params[key] = float(data[key])
        except:
            pass
    return jsonify({'status': 'ok'})

@app.route('/api/toggle/<int:pump_id>', methods=['POST'])
def toggle_pump(pump_id):
    if 0 <= pump_id < 3:
        pump_states[pump_id] = 1 - pump_states[pump_id]
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True)
