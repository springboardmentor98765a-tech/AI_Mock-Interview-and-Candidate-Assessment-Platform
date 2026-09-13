from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from test_module8_consent import db, seed, user
from app.models import RoleEnum
from app.module9_models import Notification
from app.notification_service import collect_events
from app.routes.module8_routes import share_interview, revoke_interview_share
from app.schemas import InterviewShareCreateRequest

def test_dashboards_admin_permissions_and_consent(db, monkeypatch):
    from app.main import app
    from app.auth import get_current_user
    from app.database import get_db
    from app.config import settings
    candidate,recruiter,other,interview=seed(db)
    administrator=user('Admin','admin@example.com',RoleEnum.admin)
    db.add(administrator);db.commit()
    monkeypatch.setattr(settings,'NOTIFICATION_WORKER_ENABLED',False)
    app.dependency_overrides[get_db]=lambda:db
    try:
        with TestClient(app) as client:
            assert client.get('/dashboard/admin').status_code==401
            app.dependency_overrides[get_current_user]=lambda:candidate
            assert client.get('/dashboard/admin').status_code==403
            assert client.patch('/dashboard/profile',json={'full_name':'Updated'}).json()['full_name']=='Updated'
            assert client.patch('/dashboard/profile',json={'full_name':'   '}).status_code==400
            assert client.get('/dashboard/evidence').json()['summary']['scored']==1
            app.dependency_overrides[get_current_user]=lambda:recruiter
            assert client.get('/dashboard/evidence').json()['trend']==[]
            share=share_interview(str(interview.id),InterviewShareCreateRequest(recruiter_id=recruiter.id,consent_acknowledged=True),candidate,db)
            assert client.get('/dashboard/evidence').json()['trend'][0]['candidate_id']==str(candidate.id)
            r=client.post('/module9/reminders',json={'title':'Review interviews','scheduled_at':(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()})
            assert r.status_code==201
            rid=r.json()['id']
            app.dependency_overrides[get_current_user]=lambda:other
            assert client.delete('/module9/reminders/'+rid).status_code==404
            assert client.get('/dashboard/evidence').json()['trend']==[]
            collect_events(db);collect_events(db)
            assert db.query(Notification).filter_by(user_id=recruiter.id,title='Interview shared with you').count()==1
            assert db.query(Notification).filter_by(user_id=administrator.id,title='New account registered').count()==4
            revoke_interview_share(str(interview.id),str(share.id),candidate,db)
            app.dependency_overrides[get_current_user]=lambda:recruiter
            assert client.get('/dashboard/evidence').json()['trend']==[]
            app.dependency_overrides[get_current_user]=lambda:administrator
            summary=client.get('/dashboard/admin')
            assert summary.status_code==200 and len(summary.json()['users'])==4
            assert client.patch('/dashboard/admin/users/'+str(administrator.id),json={'active':False}).status_code==400
            assert client.patch('/dashboard/admin/users/'+str(recruiter.id),json={'active':False}).status_code==200
            assert db.get(type(recruiter),recruiter.id).is_active is False
            monkeypatch.setattr(settings,'SMTP_HOST','')
            assert client.post('/dashboard/test-email').status_code==409
    finally:
        app.dependency_overrides.clear()
