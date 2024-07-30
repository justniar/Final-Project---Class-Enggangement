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
	GetAllUsers() ([]*models.User, error)
	GetUserByID(id int) (*models.User, error)
	UpdateUser(id int, name, email, phone, role string) error
	DeleteUser(id int) error
}

type userService struct {
	userRepository repositories.UserRepository
}

func NewUserService(userRepository repositories.UserRepository) UserService {
	return &userService{userRepository: userRepository}
}

func (s *userService) GetAllUsers() ([]*models.User, error) {
	return s.userRepository.GetAllUsers()
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

func (s *userService) GetUserByID(id int) (*models.User, error) {
	return s.userRepository.GetUserByID(id)
}

func (s *userService) UpdateUser(id int, name, email, phone, role string) error {
	user, err := s.userRepository.GetUserByID(id)
	if err != nil {
		return err
	}

	user.Name = name
	user.Email = email
	user.Phone = phone
	user.Role = role

	return s.userRepository.UpdateUser(user)
}

func (s *userService) DeleteUser(id int) error {
	return s.userRepository.DeleteUser(id)
}
