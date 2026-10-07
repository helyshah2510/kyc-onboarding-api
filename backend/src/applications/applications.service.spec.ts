import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PanService } from '../pan/pan.service.js';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: PrismaService,
          useValue: {
            kycApplication: {
              create: vi.fn(),
            },
          },
        },
        {
          provide: PanService,
          useValue: {
            validatePan: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
