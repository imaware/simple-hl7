const EventEmitter = require('events').EventEmitter;
const fs           = require('fs');
const Parser       = require('../hl7/parser.js');
const util         = require('util');
const watch = require('node-watch');

function FileServer(options, handler) {
  EventEmitter.call(this);

  if (!handler) {
    handler = options;
    options = {};
  }

  this.monitor = null;
  this.handler = handler;
  this.parser = options.parser || new Parser();
}

util.inherits(FileServer, EventEmitter);

function Req(msg, f) {
  this.file = f;
  this.msg = msg;
  this.sender = msg.header.getField(1).length == 1 ?
    msg.header.getField(1).toString() :
    msg.header.getField(1);

  this.facility = msg.header.getField(2).length == 1 ?
    msg.header.getField(2).toString() :
    msg.header.getField(2);

  this.type = msg.header.getComponent(7, 1).toString();
  this.event = msg.header.getComponent(7, 2).toString();
}

function Res() {

}

FileServer.prototype.start = function(src) {
  var self = this;
  var createdFiles = [];

  setTimeout(function() {
    createdFiles = [];
  }, 3000);

  self.monitor = watch(src, { recursive: true });

  self.monitor.on('change', function(event, name) {
    if (event === 'update') {
      if(createdFiles.indexOf(name) === -1) {
        createdFiles.push(name);

        fs.readFile(name, function(err, data) {
          if (err) {
            self.handler(err);
            return;
          }

          try {
            var hl7 = self.parser.parse(data.toString());
            var req = new Req(hl7, name);
            var res = new Res();
            self.handler(null, req, res);
          } catch (e) {
            self.handler(e);
          }
        });
      }
    }
  });
}

FileServer.prototype.stop = function() {
  this.monitor.close()
}


module.exports = FileServer;
