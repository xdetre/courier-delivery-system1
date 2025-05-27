from sqlalchemy import Column, Integer,String
from database import Base


class Courier(Base):
    __tablename__ = "couriers"

    id= Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)