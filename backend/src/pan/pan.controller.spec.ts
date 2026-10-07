import { Test, TestingModule } from '@nestjs/testing';
import { PanController } from './pan.controller.js';
import { PanService } from './pan.service.js';

describe('PanController', () => {
  let controller: PanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PanController],
      providers: [
        {
          provide: PanService,
          useValue: {
            validatePan: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PanController>(PanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
