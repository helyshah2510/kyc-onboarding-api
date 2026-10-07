import { Test, TestingModule } from '@nestjs/testing';
import { PanService } from './pan.service.js';
import { PanVerificationService } from './pan-verification.service.js';

describe('PanService', () => {
  let service: PanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PanService,
        {
          provide: PanVerificationService,
          useValue: {
            findPanRecord: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PanService>(PanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
