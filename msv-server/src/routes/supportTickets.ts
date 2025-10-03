import express from 'express';
import { Request, Response } from 'express';
import { SupportTicket, SupportResponse } from '../models';

const router = express.Router();

// 지원 티켓 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error: any) {
    console.error('지원 티켓 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 티켓 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 지원 티켓 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: '지원 티켓을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error: any) {
    console.error('지원 티켓 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 티켓 조회 중 오류가 발생했습니다.'
    });
  }
});

// 지원 티켓 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const ticketData = {
      ...req.body,
      tenant_id: 1,
      company_id: 1
    };

    const ticket = await SupportTicket.create(ticketData);

    res.status(201).json({
      success: true,
      message: '지원 티켓이 성공적으로 등록되었습니다.',
      data: ticket
    });
  } catch (error: any) {
    console.error('지원 티켓 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 티켓 생성 중 오류가 발생했습니다.'
    });
  }
});

// 지원 티켓 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: '지원 티켓을 찾을 수 없습니다.'
      });
    }

    await ticket.update(req.body);

    res.json({
      success: true,
      message: '지원 티켓이 성공적으로 수정되었습니다.',
      data: ticket
    });
  } catch (error: any) {
    console.error('지원 티켓 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 티켓 수정 중 오류가 발생했습니다.'
    });
  }
});

// 지원 티켓 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: '지원 티켓을 찾을 수 없습니다.'
      });
    }

    await ticket.destroy();

    res.json({
      success: true,
      message: '지원 티켓이 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('지원 티켓 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 티켓 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 지원 티켓 응답 목록 조회
router.get('/:id/responses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const responses = await SupportResponse.findAll({
      where: { ticket_id: id },
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: responses
    });
  } catch (error: any) {
    console.error('지원 응답 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 응답 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 지원 티켓 응답 생성
router.post('/:id/responses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const responseData = {
      ...req.body,
      ticket_id: id,
      user_id: 1 // 실제로는 인증된 사용자 ID를 사용해야 함
    };

    const response = await SupportResponse.create(responseData);

    // 티켓의 마지막 응답 시간 업데이트
    await SupportTicket.update(
      { last_response_at: new Date() },
      { where: { id } }
    );

    res.status(201).json({
      success: true,
      message: '응답이 성공적으로 등록되었습니다.',
      data: response
    });
  } catch (error: any) {
    console.error('지원 응답 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '지원 응답 생성 중 오류가 발생했습니다.'
    });
  }
});

export default router;
