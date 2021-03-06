import { execFileSync, execFile, spawn } from 'child_process';
import { expect } from 'chai';
import http from 'http';
import https from 'https';

describe('cli', function () {
  this.timeout(5000);
  it('correct help message', function () {
    const msg = execFileSync('node', [
      'node_modules/babel-cli/bin/babel-node.js',
      'src/bin/flex-mock-server.js',
      '--help',
    ]);
    expect(msg.indexOf('module.exports = {') > -1).to.be.ok;
  });

  function test(proto, get, done, flag) {
    let createChild = spawn;
    const opts = {};
    if (process.platform === 'win32') {
      createChild = execFile;
    } else {
      opts.detached = true;
    }
    const child = createChild(
      'node',
      ['node_modules/babel-cli/bin/babel-node.js', 'src/bin/flex-mock-server.js', flag],
      opts,
    );
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get(`${proto}://localhost:3000/abcdef`, (res) => {
          expect(res.statusCode).to.be.equal(404);
          if (process.platform === 'win32') {
            console.log('killing');
            child.kill();
          } else {
            process.kill(-child.pid);
          }
        });
      }
    });
    child.on('error', (error) => {
      done(error);
    });
    child.on('exit', (code) => {
      if (code) {
        done(new Error('Server error'));
      } else {
        const req = get(`${proto}://localhost:3000/abcdef`, (res) => {
          console.log('failed to shutdown', res.statusCode);
        });
        req.on('data', function (data) {
          const err = new Error(`server still running, ${data}`);
          console.log(err.message);
          done(err);
        });
        req.on('error', function (err) {
          console.log('server shutted down', err);
          done();
        });
      }
    });
  }

  it('http server runs successfully', function (done) {
    test('http', http.get, done);
  });
  it('https server runs successfully', function (done) {
    test('https', https.get, done, '-H');
  });
});
