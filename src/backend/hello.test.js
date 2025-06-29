import request from 'supertest';
import express from 'express';
import cors from 'cors';

describe('GET /hello', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(cors());
    app.get('/hello', (req, res) => {
      res.send('world');
    });
  });

  it('should return world', async () => {
    const res = await request(app).get('/hello');
    expect(res.status).toBe(200);
    expect(res.text).toBe('world');
  });
});
