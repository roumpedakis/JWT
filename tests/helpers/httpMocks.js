function mockReq({ headers = {}, query = {}, body = {} } = {}) {
    return { headers, query, body };
}

function mockRes() {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
}

module.exports = { mockReq, mockRes };
