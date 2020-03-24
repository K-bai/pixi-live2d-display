import { Application } from '@pixi/app';
import assert from 'assert';
import sinon from 'sinon';
import { resolve as urlResolve } from 'url';
import { Live2DModel } from '../src';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/live2d/Live2DInternalModel';
import { TEST_MODEL } from './env';
import { loadArrayBuffer, remoteRequire, resetState } from './utils';

const app = new Application({
    width: 1000,
    height: 1000,
});
document.body.appendChild(app.view);

describe('Live2DModel', async () => {
    /** @type {Live2DModel} */
    let model;
    let modelBaseWidth, modelBaseHeight;

    before(async () => {
        model = await Live2DModel.fromModelSettingsFile(TEST_MODEL.file);
        modelBaseWidth = model.internal.originalWidth * (model.internal.modelSettings.layout.width || LOGICAL_WIDTH) / LOGICAL_WIDTH;
        modelBaseHeight = model.internal.originalHeight * (model.internal.modelSettings.layout.height || LOGICAL_HEIGHT) / LOGICAL_HEIGHT;

        app.stage.addChild(model);
    });

    beforeEach(() => {
        resetState(model);
    });

    afterEach(() => {
        app.render(); // let me see see!!
    });

    it('should render without error', () => {
        app.render();
        app.render();
        model.update(performance.now() + 1000);
        app.render();
    });

    it('should have correct size', () => {
        assert.equal(model.internal.originalWidth, TEST_MODEL.width);
        assert.equal(model.internal.originalHeight, TEST_MODEL.height);

        assert.equal(model.width, modelBaseWidth);
        assert.equal(model.height, modelBaseHeight);

        model.scale.set(10, 0.1);

        assert.equal(model.width, modelBaseWidth * 10);
        assert.equal(model.height, modelBaseHeight * 0.1);
    });

    it('should have correct bounds according to size, position and anchor', () => {
        model.scale.set(2, 3);
        model.position.set(200, 300);
        model.anchor.set(0.2, 0.3);

        const bounds = model.getBounds();

        assert.equal(bounds.x, 200 - modelBaseWidth * 2 * 0.2);
        assert.equal(bounds.y, 300 - modelBaseHeight * 3 * 0.3);
        assert.equal(bounds.width, modelBaseWidth * 2);
        assert.equal(bounds.height, modelBaseHeight * 3);
    });

    it('should handle tapping', () => {
        const listener = sinon.spy();

        model.on('hit', listener);

        model.tap(-1, -1);
        assert(!listener.called);

        for (const { name, x, y } of TEST_MODEL.hitAreas) {
            model.tap(x, y);
            assert(listener.lastCall.calledWith(name), name);

            // mimic an InteractionEvent
            model.emit('tap', { data: { global: { x, y } } });
            assert(listener.lastCall.calledWith(name), name);
        }
    });
});

describe('Live2DModel loading variants', () => {
    const json = remoteRequire(TEST_MODEL.file);

    it('should load Live2DModel', async () => {
        let model = await Live2DModel.fromModelSettingsJSON(json, TEST_MODEL.file);

        assert(model, 'fromModelSettingsJSON');

        const settings = model.internal.modelSettings;

        model = await Live2DModel.fromModelSettings(settings);

        assert(model, 'fromModelSettings');

        model = Live2DModel.fromResources({
            settings,
            model: await loadArrayBuffer(urlResolve(TEST_MODEL.file, settings.model)),
            textures: model.textures,
            pose: settings.pose && urlResolve(TEST_MODEL.file, settings.pose),
            physics: settings.physics && urlResolve(TEST_MODEL.file, settings.physics),
        });

        assert(model, 'fromResources');
    });
});