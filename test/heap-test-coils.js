'use strict';

const modbus = require('../');
const v8 = require('v8');
const net = require('net');

const options = {
  host: 'localhost',
  port: 8888
};
const client = new modbus.client.TCP(options);
client.connect();

const request = function() {
  return client.readCoils(0, 13);
};

client.socket.on('connect', function() {
  let p = Promise.resolve();

  for (let i = 1; i < 1e5; i++) {
    p = p.then(request);
  }

  p.then(function() {
    const usedHeapSize = Math.floor(
      v8.getHeapStatistics().used_heap_size / 1e6
    );

    console.log('Heap:', usedHeapSize, 'MB');

    client.disconnect();
  });
});
