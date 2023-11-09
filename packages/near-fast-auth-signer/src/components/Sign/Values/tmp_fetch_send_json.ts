// Taken from Near Wallet
// @ts-ignore
const fetch = (typeof window === 'undefined' || window.name === 'nodejs') ? require('node-fetch') : window.fetch;

const createError = require('http-errors');

module.exports = async function sendJson(method, url, json) {
  const response = await fetch(url, {
    method,
    body:    method !== 'GET' ? JSON.stringify(json) : undefined,
    headers: {
      'Content-type': 'application/json; charset=utf-8',
    }
  });
  if (!response.ok) {
    const body = await response.text();
    let parsedBody;

    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      throw createError(response.status, body);
    }

    throw createError(response.status, parsedBody);
  }
  if (response.status === 204) {
    // No Content
    return null;
  }
  return response.json();
};
