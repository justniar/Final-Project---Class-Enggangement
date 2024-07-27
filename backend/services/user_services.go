package services

import (
	"backend/models"
	"backend/repositories"
	"backend/utils"
	"errors"
)

type UserService interface {
	Register(name, email, password, phone, role string) error
	Login(email, password string) (*models.User, error)
}

type userService struct {
	userRepository repositories.UserRepository
}

func NewUserService(userRepository repositories.UserRepository) UserService {
	return &userService{userRepository: userRepository}
}

func (s *userService) Register(name, email, password, phone, role string) error {
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return err
	}

	user := &models.User{
		Name:     name,
		Email:    email,
		Password: hashedPassword,
		Phone:    phone,
		Role:     role,
	}

	return s.userRepository.CreateUser(user)
}

func (s *userService) Login(email, password string) (*models.User, error) {
	user, err := s.userRepository.FindUserByEmail(email)
	if err != nil {
		return nil, err
	}

	if !utils.CheckPasswordHash(password, user.Password) {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}
