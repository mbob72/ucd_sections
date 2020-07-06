import runAsyncGenerator from '../run_async_generator';

const syncGenerator = function* (thrw) {
    const val = yield 1;
    const val2 = yield 2;
    if (thrw) {
        throw new Error('Test error');
    }
    return val + val2;
};

const asyncGenerator = function* (thrw) {
    const val = yield Promise.resolve(1);
    const val2 = yield new Promise((resolve, reject) => {
        setTimeout(() => thrw ? reject(new Error('Test error')) : resolve(2), 100);
    });
    return val + val2;
};


describe('Testing the asynchronous generator processor', () => {
    it('Call resolve at the end of computation #1: syncGenerator', async () => {
        const resolveMock = jest.fn();
        const rejectMock = jest.fn();
        const syncGen = syncGenerator();
        await new Promise((resolve) => {
            const res = (v) => {
                resolve();
                resolveMock(v);
            };
            const rej = (err) => {
                resolve();
                rejectMock(err);
            }
            runAsyncGenerator(syncGen, res, rej);
        });

        expect(resolveMock.mock.calls.length).toBe(1);
        expect(resolveMock.mock.calls[0][0]).toBe(3)
        expect(rejectMock.mock.calls.length).toBe(0);
    })

    it('Call resolve at the end of computation #2: asyncGenerator', async () => {
        const resolveMock = jest.fn();
        const rejectMock = jest.fn();
        const syncGen = asyncGenerator();
        await new Promise((resolve) => {
            const res = (v) => {
                resolve();
                resolveMock(v);
            };
            const rej = (err) => {
                resolve();
                rejectMock(err);
            }
            runAsyncGenerator(syncGen, res, rej);
        });

        expect(resolveMock.mock.calls.length).toBe(1);
        expect(resolveMock.mock.calls[0][0]).toBe(3)
        expect(rejectMock.mock.calls.length).toBe(0);
    })

    it('Call reject on error #1: syncGenerator', async () => {
        const resolveMock = jest.fn();
        const rejectMock = jest.fn();
        const syncGen = syncGenerator(true);
        await new Promise((resolve) => {
            const res = (v) => {
                resolve();
                resolveMock(v);
            };
            const rej = (err) => {
                resolve();
                rejectMock(err);
            }
            runAsyncGenerator(syncGen, res, rej);
        });

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock.mock.calls.length).toBe(1);
    })

    it('Call reject on error #2: asyncGenerator', async () => {
        const resolveMock = jest.fn();
        const rejectMock = jest.fn();
        const syncGen = asyncGenerator(true);
        await new Promise((resolve) => {
            const res = (v) => {
                resolve();
                resolveMock(v);
            };
            const rej = (err) => {
                resolve();
                rejectMock(err);
            }
            runAsyncGenerator(syncGen, res, rej);
        });

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock.mock.calls.length).toBe(1);
    })

    it('Unexpected error during processing', () => {
        const resolveMock = jest.fn();
        const rejectMock = jest.fn();
        const nonIterable = {};
        runAsyncGenerator(nonIterable, resolveMock, rejectMock);
        expect(rejectMock.mock.calls.length).toBe(1);
    })

    it('Processor return void #1: syncGenerator', () => {
        const res = runAsyncGenerator(syncGenerator(), () => {}, () => {})
        expect(res).toBe(void 0);
    })

    it('Processor return void #2: asyncGenerator', () => {
        const res = runAsyncGenerator(asyncGenerator(), () => {}, () => {})
        expect(res).toBe(void 0);
    })
})